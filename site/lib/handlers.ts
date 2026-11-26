// Every route's logic. Route files under app/ pass in the request and, where needed, the db.
// Taking `sql` as an argument is what lets the tests run these with a stub.
import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import { env, authEnabled } from "./env";
import {
  SESSION_COOKIE, TX_COOKIE, SESSION_DAYS, tenant, siteOrigin, safeReturnTo, random, pkceChallenge, setCookie,
  sealTx, readTx, sealSession, readSession, verifyIdToken, verifyAccessToken, bearer, type Tx,
} from "./auth";
import { validateVote, score, ranksFor, matchSetups, EMAIL } from "./votes";
import { validSetups, renderSetupMd } from "./setups";
import { BADGE_SVG } from "./badge";
import { renderLeaderboard } from "./leaderboard";
import { renderVotePage } from "./votepage";
import { renderWelcome } from "./welcome";
import type { Product, Setup, VoteReply, VoteRow } from "./types";

const RAW = "https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main";
const SKILL_DESCRIPTION = "Vote on the Marketing Engineering tool list using what the user actually uses. Use when the user asks to vote, rank, submit or add marketing tools, skills or plugins to proxy-intell/marketing-engineering, or pastes the vote.md link.";

const MAX_BODY = 20_000;
const MAX_VOTES_PER_IP_PER_DAY = 10;

// GitHub raw files, cached 5 min like the worker's edge cache.
const raw = (file: string) => fetch(`${RAW}/${file}`, { next: { revalidate: 300 } });

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...headers } });

export const notFound = () => json({ error: "not found" }, 404);

// Read the body only if it's small. Checking after reading would let one 32 MB request (Cloud Run's cap) eat the memory first.
// A chunked request has no content-length, so the text.length check after reading still applies.
const tooBig = (request: Request, max: number) => Number(request.headers.get("content-length")) > max;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Google's load balancer appends "<client>, <lb>" to x-forwarded-for, so the client is second from the right.
// Anything further left is whatever the caller sent, so never trust it. Cloud Run ingress is LB-only.
const clientIp = (request: Request) => {
  const hops = (request.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  return hops.at(-2) ?? hops.at(-1) ?? "unknown";
};
const ipHash = (request: Request) => {
  // An unsalted hash of an IPv4 address is trivially reversible.
  if (!env.IP_SALT && process.env.NODE_ENV === "production") throw new Error("IP_SALT is not set");
  return sha256(`${env.IP_SALT}${clientIp(request)}`);
};

// Fire and forget, for analytics only (Cloud Run keeps CPU on after the response). Logs failures, never throws.
const bg = (p: Promise<unknown>) => void p.catch((e) => console.error("background task failed", e));

// Best effort, never blocks or fails a response. Agents don't run JS, so their hits are tracked here.
const capture = (event: string, distinct_id: string, properties: Record<string, unknown> = {}) => {
  if (!env.POSTHOG_KEY) return;
  bg(fetch("https://eu.i.posthog.com/i/v0/e/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ api_key: env.POSTHOG_KEY, event, distinct_id, properties }),
  }).catch((e) => console.error("posthog capture failed", e)));
};

// Anonymous per-visitor id for agent fetches: salted IP hash, no person profile.
const agentHit = (request: Request, kind: string) => capture("agent_page_fetched", ipHash(request), {
  kind, $current_url: request.url, user_agent: request.headers.get("user-agent") ?? "", $process_person_profile: false,
});

// 10 per IP per day, shared by votes and sign-ups. Only a salted hash of the IP is stored.
// `bucket` lets other counters share the table without sharing a count (sign-in uses "auth:<hour>").
async function rateHit(sql: Sql, request: Request, bucket = new Date().toISOString().slice(0, 10)): Promise<number> {
  const day = bucket;
  const [{ n }] = await sql`INSERT INTO rate (ip_hash, day, n) VALUES (${ipHash(request)}, ${day}, 1)
    ON CONFLICT (ip_hash, day) DO UPDATE SET n = rate.n + 1 RETURNING n`;
  return n;
}

// BIGINT comes back as a string; payload is stored as JSON text.
const voteRows = async (sql: Sql): Promise<VoteRow[]> =>
  (await sql`SELECT updated_at, payload FROM votes`).map((r) => ({ updated_at: Number(r.updated_at), payload: JSON.parse(r.payload) }));

export async function scores(sql: Sql) {
  return json(score(await voteRows(sql), Date.now(), await loadSetups()), 200, { "cache-control": "public, max-age=300" });
}

export async function vote(request: Request, sql: Sql) {
  if (tooBig(request, MAX_BODY)) return json({ error: "body too large" }, 413);
  const text = await request.text();
  if (text.length > MAX_BODY) return json({ error: "body too large" }, 413);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }
  const { vote, error } = validateVote(body);
  if (!vote) return json({ error }, 400);

  if ((await rateHit(sql, request)) > MAX_VOTES_PER_IP_PER_DAY) return json({ error: "too many votes from this address today" }, 429);

  const existed = (await sql`SELECT 1 FROM votes WHERE install_id = ${vote.install_id}`).length > 0;
  const emailHash = vote.email ? sha256(vote.email) : null;
  const now = Date.now();
  const firstSignup = await sql.begin(async (tx) => {
    // One vote per person: a vote with a known email replaces that person's votes from other installs.
    // The lock serialises same-email votes so two installs can't both survive.
    if (emailHash) await tx`SELECT pg_advisory_xact_lock(hashtext(${emailHash}))`;
    if (emailHash) await tx`DELETE FROM votes WHERE email_hash = ${emailHash} AND install_id != ${vote.install_id}`;
    await tx`INSERT INTO votes (install_id, email_hash, agent, updated_at, payload)
      VALUES (${vote.install_id}, ${emailHash}, ${vote.agent}, ${now}, ${JSON.stringify({ tools: vote.tools, proposals: vote.proposals })})
      ON CONFLICT (install_id) DO UPDATE SET email_hash = excluded.email_hash, agent = excluded.agent, updated_at = excluded.updated_at, payload = excluded.payload`;
    if (!vote.weekly_drop) return false;
    // Only inserts a row the first time this email signs up.
    const ins = await tx`INSERT INTO subscribers (email_hash, email, created_at) VALUES (${emailHash}, ${vote.email}, ${now}) ON CONFLICT (email_hash) DO NOTHING`;
    return ins.count > 0;
  });
  capture("vote_submitted", vote.install_id, {
    agent: vote.agent, tools: vote.tools.length, proposals: vote.proposals.length, new: !existed, weekly_drop: vote.weekly_drop, $process_person_profile: false,
  });

  if (vote.weekly_drop && vote.email && emailHash && env.RESEND_API_KEY) {
    // Awaited: a dropped welcome can't be retried (the subscriber row already exists). Both swallow their own errors.
    await Promise.allSettled([addToResend(vote.email), firstSignup && sendWelcome(vote.email, emailHash, true)]);
  }

  // The vote is stored by now. A setups lookup failure only empties the list.
  let setups: VoteReply["setups"] = [];
  try {
    const res = await raw("catalog.json");
    if (res.ok) {
      const { products } = (await res.json()) as { products: Product[] };
      const names = Object.fromEntries(products.map((p) => [p.slug, p.name]));
      setups = matchSetups(vote.tools, await loadSetups(new Set(Object.keys(names)))).slice(0, 3)
        .map((m) => ({ ...m, missing: m.missing.map((s) => names[s] ?? s) }));
    }
  } catch (e) { console.error("setups lookup failed", e); }

  // Where the voter now stands, so the agent can say "you're voter #N, PostHog is #2".
  const scores = score(await voteRows(sql));
  const reply: VoteReply = {
    ok: true,
    counted: { tools: vote.tools.length, proposals: vote.proposals.length },
    subscribed: vote.weekly_drop,
    new: !existed,
    voters: scores.voters,
    ranks: ranksFor(scores.tools, vote.tools.map((t) => t.slug)),
    setups,
  };
  return json(reply);
}

// Friday drop sign-up from the site's email box. Shares the per-IP daily limit with votes.
export async function subscribe(request: Request, sql: Sql) {
  if (tooBig(request, 1000)) return json({ error: "body too large" }, 413);
  const text = await request.text();
  if (text.length > 1000) return json({ error: "body too large" }, 413);
  let email;
  try {
    email = JSON.parse(text).email;
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }
  if (typeof email !== "string" || email.length > 254 || !EMAIL.test(email.trim())) return json({ error: "that email doesn't look right" }, 400);
  email = email.trim().toLowerCase();
  if ((await rateHit(sql, request)) > MAX_VOTES_PER_IP_PER_DAY) return json({ error: "too many tries from this address today" }, 429);
  const emailHash = sha256(email);
  const ins = await sql`INSERT INTO subscribers (email_hash, email, created_at) VALUES (${emailHash}, ${email}, ${Date.now()}) ON CONFLICT (email_hash) DO NOTHING`;
  if (env.RESEND_API_KEY) {
    await Promise.allSettled([addToResend(email), ins.count > 0 && sendWelcome(email, emailHash, false)]);
  }
  capture("drop_subscribed", email, { surface: "worker", $set: { email } });
  return json({ ok: true });
}

// Vote page: agents link here with ?t=slug:usage,... and the person sends it
export async function votePage() {
  const catalogRes = await raw("catalog.json");
  if (!catalogRes.ok) return json({ error: "catalog unavailable" }, 502);
  const { products } = await catalogRes.json();
  return new Response(renderVotePage(products), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}

// Short, stable URL for agents. The pasted command names what to check, so consent comes from the person and not from this page.
export async function voteMd(request: Request) {
  agentHit(request, "vote.md");
  return fetchVoteMd();
}

export const badge = () =>
  new Response(BADGE_SVG, { headers: { "content-type": "image/svg+xml", "cache-control": "public, max-age=86400" } });

// Agent Skills discovery, same shape other skill catalogs publish at /.well-known/skills/
export const skillsIndex = () =>
  json({ skills: [{ name: "vote-marketing-engineering", description: SKILL_DESCRIPTION, files: ["SKILL.md"] }] }, 200, { "cache-control": "public, max-age=3600" });

export async function skillMd(request: Request) {
  agentHit(request, "skill");
  return fetchVoteMd();
}

// One setup as agent-readable markdown
export async function setupMd(request: Request) {
  const match = new URL(request.url).pathname.match(/^\/setups\/([a-z0-9-]{1,40})\.md$/);
  if (!match) return notFound();
  let products: Product[];
  try {
    const catalogRes = await raw("catalog.json");
    if (!catalogRes.ok) return json({ error: "catalog unavailable" }, 502);
    ({ products } = await catalogRes.json());
  } catch {
    return json({ error: "catalog unavailable" }, 502);
  }
  const setup = (await loadSetups(new Set(products.map((p) => p.slug)))).find((s) => s.slug === match[1]);
  if (!setup) return notFound();
  agentHit(request, `setup:${setup.slug}`);
  return new Response(renderSetupMd(setup, products), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
}

// Public scoreboard
export async function home(sql: Sql) {
  const [catalogRes, rows] = await Promise.all([raw("catalog.json"), voteRows(sql)]);
  if (!catalogRes.ok) return json({ error: "catalog unavailable" }, 502);
  const { products } = (await catalogRes.json()) as { products: Product[] };
  const setups = await loadSetups(new Set(products.map((p) => p.slug)));
  const scores = score(rows, Date.now(), setups);
  return new Response(renderLeaderboard(products, scores, setups), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}

// Never throws: a missing or broken setups.json means no setups, not a broken site.
async function loadSetups(slugs: Set<string> | null = null): Promise<Setup[]> {
  try {
    const res = await raw("setups.json");
    return res.ok ? validSetups(await res.json(), slugs) : [];
  } catch {
    return [];
  }
}

// Best effort, once per email (the idempotency key stops double sends on retries).
async function sendWelcome(email: string, emailHash: string, voted: boolean) {
  const { subject, html, text } = renderWelcome({ voted });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": `welcome/${emailHash}` },
    body: JSON.stringify({ from: env.RESEND_FROM, to: [email], reply_to: env.RESEND_REPLY_TO || undefined, subject, html, text }),
  });
  if (!res.ok) console.error("welcome email failed", res.status, await res.text());
}

// Best effort. The subscribers table is the source of truth if Resend is down.
async function addToResend(email: string) {
  const body: { email: string; unsubscribed: boolean; segments?: { id: string }[] } = { email, unsubscribed: false };
  if (env.RESEND_SEGMENT_ID) body.segments = [{ id: env.RESEND_SEGMENT_ID }];
  const res = await fetch("https://api.resend.com/contacts", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("resend contact create failed", res.status, await res.text());
}

async function fetchVoteMd() {
  const res = await raw("vote.md");
  if (!res.ok) return new Response(JSON.stringify({ error: "vote.md unavailable, read it on GitHub" }), { status: 502, headers: { "content-type": "application/json" } });
  return new Response(await res.text(), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
}

// ---- Sign-in (Auth0). Every handler is a 404 until all the AUTH0_* vars are set (env.authEnabled). ----

const NO_STORE = { "cache-control": "no-store" };
// Shared by /v1/auth/device and /v1/auth/token, counted apart from votes (bucket "auth:<hour>").
// A 15-minute sign-in polled every 5 s is ~180 calls, so this leaves room for a few attempts per hour.
const MAX_AUTH_PER_IP_PER_HOUR = 300;
const authBucket = () => `auth:${new Date().toISOString().slice(0, 13)}`;
const UNAVAILABLE = { error: "unavailable", message: "sign-in is unavailable right now, try again later" };

// Form-encoded POST to the tenant. Tokens and codes are in the body, never in a URL or a log line.
const tenantPost = (path: string, params: Record<string, string>) =>
  fetch(tenant(path), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
    signal: AbortSignal.timeout(10_000),
  });

// GET /auth/login?returnTo=/v?t=... : PKCE verifier, state and nonce go in a short encrypted cookie, then off to the tenant.
export async function authLogin(request: Request) {
  if (!authEnabled()) return notFound();
  const tx: Tx = { state: random(), verifier: random(), nonce: random(), ret: safeReturnTo(new URL(request.url).searchParams.get("returnTo")) };
  const to = new URL(tenant("/authorize"));
  for (const [k, v] of Object.entries({
    response_type: "code", client_id: env.AUTH0_CLIENT_ID, redirect_uri: `${siteOrigin(request)}/auth/callback`, scope: "openid email",
    state: tx.state, nonce: tx.nonce, code_challenge: pkceChallenge(tx.verifier), code_challenge_method: "S256",
  })) to.searchParams.set(k, v);
  return new Response(null, { status: 302, headers: { location: to.toString(), "set-cookie": setCookie(request, TX_COOKIE, await sealTx(tx), 600, "/auth"), ...NO_STORE } });
}

// GET /auth/callback?code&state : check state, swap the code (with the PKCE verifier), verify the id token, set the session.
export async function authCallback(request: Request) {
  if (!authEnabled()) return notFound();
  const url = new URL(request.url);
  const tx = await readTx(request);
  const clearTx = setCookie(request, TX_COOKIE, "", 0, "/auth");
  const fail = (error: string, status = 400) => json({ error }, status, { ...NO_STORE, "set-cookie": clearTx });
  if (!tx) return fail("that sign-in expired, start again at /auth/login");
  // Cancelled or refused at the tenant: back where they were, still signed out.
  if (url.searchParams.get("error")) return new Response(null, { status: 302, headers: { location: tx.ret, "set-cookie": clearTx, ...NO_STORE } });
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== tx.state) return fail("that sign-in didn't match, start again at /auth/login");

  let idToken: unknown;
  try {
    const res = await tenantPost("/oauth/token", {
      grant_type: "authorization_code", client_id: env.AUTH0_CLIENT_ID, client_secret: env.AUTH0_CLIENT_SECRET,
      code, code_verifier: tx.verifier, redirect_uri: `${siteOrigin(request)}/auth/callback`,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) { console.error("auth code exchange failed", res.status, body.error); return fail("sign-in failed, try again", 502); }
    idToken = body.id_token;
  } catch (e) {
    console.error("auth code exchange failed", (e as Error).name);
    return fail("sign-in failed, try again", 502);
  }
  let claims;
  try {
    if (typeof idToken !== "string") throw new Error("no id token");
    claims = await verifyIdToken(idToken, tx.nonce);
  } catch {
    return fail("sign-in failed, try again", 502);
  }
  const sub = typeof claims.sub === "string" ? claims.sub : "";
  if (!sub) return fail("sign-in failed, try again", 502);
  const email = typeof claims.email === "string" && claims.email_verified !== false ? claims.email.toLowerCase() : null;
  const headers = new Headers({ location: tx.ret, ...NO_STORE });
  headers.append("set-cookie", clearTx);
  headers.append("set-cookie", setCookie(request, SESSION_COOKIE, await sealSession({ sub, email }), SESSION_DAYS * 86400));
  capture("signed_in", sub, { surface: "web" });
  return new Response(null, { status: 302, headers });
}

// POST /auth/logout from the header's sign-out button. Same-origin only, so another site can't sign people out.
// Clears the cookie, then ends the tenant session too so the next sign-in asks again.
export async function authLogout(request: Request) {
  if (!authEnabled()) return notFound();
  const origin = siteOrigin(request);
  if (request.headers.get("origin") !== origin) return json({ error: "sign-out must come from this site" }, 403, NO_STORE);
  const to = new URL(tenant("/v2/logout"));
  to.searchParams.set("client_id", env.AUTH0_CLIENT_ID);
  to.searchParams.set("returnTo", `${origin}/`);
  return new Response(null, { status: 303, headers: { location: to.toString(), "set-cookie": setCookie(request, SESSION_COOKIE, "", 0), ...NO_STORE } });
}

// GET /v1/me: who is this? Cookie session (browser) or Authorization: Bearer <access token> (CLI, agents).
// A bearer token that doesn't verify is a 401, so an agent can check a token before saving it.
export async function me(request: Request) {
  if (!authEnabled()) return json({ signed_in: false }, 200, NO_STORE);
  const token = bearer(request);
  const s = token ? await verifyAccessToken(token) : await readSession(request);
  if (token && !s) return json({ signed_in: false, error: "invalid or expired token" }, 401, NO_STORE);
  return json(s ? { signed_in: true, email: s.email, sub: s.sub } : { signed_in: false }, 200, NO_STORE);
}

// Size limit, JSON object, then the per-IP sign-in counter. Returns the body or the error response.
async function authBody(request: Request, sql: Sql, max: number): Promise<{ body: Record<string, unknown> } | { error: Response }> {
  if (tooBig(request, max)) return { error: json({ error: "body too large" }, 413, NO_STORE) };
  const text = await request.text();
  if (text.length > max) return { error: json({ error: "body too large" }, 413, NO_STORE) };
  let body: unknown = {};
  if (text.trim()) {
    try { body = JSON.parse(text); } catch { return { error: json({ error: "body must be JSON" }, 400, NO_STORE) }; }
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: json({ error: "body must be a JSON object" }, 400, NO_STORE) };
  if ((await rateHit(sql, request, authBucket())) > MAX_AUTH_PER_IP_PER_HOUR) {
    return { error: json({ error: "rate_limited", message: "too many sign-in requests from this address, try again in an hour" }, 429, NO_STORE) };
  }
  return { body: body as Record<string, unknown> };
}

// POST /v1/auth/device: start a CLI sign-in. The site asks the tenant, so the tenant's hostname never has to be published.
export async function authDevice(request: Request, sql: Sql) {
  if (!authEnabled()) return notFound();
  const got = await authBody(request, sql, 1000);
  if ("error" in got) return got.error;
  try {
    const res = await tenantPost("/oauth/device/code", { client_id: env.AUTH0_CLI_CLIENT_ID, scope: "openid email offline_access", audience: env.AUTH0_AUDIENCE });
    const b = await res.json().catch(() => ({}));
    if (!res.ok || typeof b.device_code !== "string") {
      console.error("device code request failed", res.status, b.error);
      return json(UNAVAILABLE, 502, NO_STORE);
    }
    const { device_code, user_code, verification_uri, verification_uri_complete, interval, expires_in } = b;
    return json({ device_code, user_code, verification_uri, verification_uri_complete, interval: interval ?? 5, expires_in }, 200, NO_STORE);
  } catch (e) {
    console.error("device code request failed", (e as Error).name);
    return json(UNAVAILABLE, 502, NO_STORE);
  }
}

// The tenant's polling errors, passed through with a status and a line an agent can show as is.
const TOKEN_ERRORS: Record<string, [number, string]> = {
  authorization_pending: [428, "waiting for you to approve in the browser"],
  slow_down: [429, "polling too fast: wait 5 more seconds between tries"],
  expired_token: [410, "that sign-in expired, start again"],
  access_denied: [403, "sign-in was cancelled or refused"],
};

// POST /v1/auth/token {device_code} (poll at `interval`) or {refresh_token}. Returns {access_token, refresh_token?, expires_in}.
export async function authToken(request: Request, sql: Sql) {
  if (!authEnabled()) return notFound();
  const got = await authBody(request, sql, 4000);
  if ("error" in got) return got.error;
  const { device_code, refresh_token } = got.body;
  const ok = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 2000;
  let params: Record<string, string>;
  if (ok(device_code) && refresh_token === undefined) params = { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code, client_id: env.AUTH0_CLI_CLIENT_ID };
  else if (ok(refresh_token) && device_code === undefined) params = { grant_type: "refresh_token", refresh_token, client_id: env.AUTH0_CLI_CLIENT_ID };
  else return json({ error: "invalid_request", message: "send {device_code} or {refresh_token}" }, 400, NO_STORE);

  let res: Response, b: Record<string, unknown>;
  try {
    res = await tenantPost("/oauth/token", params);
    b = await res.json().catch(() => ({}));
  } catch (e) {
    console.error("token request failed", (e as Error).name);
    return json(UNAVAILABLE, 502, NO_STORE);
  }
  if (res.ok && typeof b.access_token === "string") {
    if (params.device_code && env.POSTHOG_KEY) {
      const token = b.access_token;
      bg((async () => { const s = await verifyAccessToken(token); if (s) capture("signed_in", s.sub, { surface: "cli" }); })());
    }
    return json({ access_token: b.access_token, refresh_token: b.refresh_token, expires_in: b.expires_in, token_type: "Bearer" }, 200, NO_STORE);
  }
  const code = typeof b.error === "string" ? b.error : "";
  const known = TOKEN_ERRORS[code];
  if (known) return json({ error: code, message: known[1] }, known[0], NO_STORE);
  if (code === "invalid_grant") {
    return params.refresh_token
      ? json({ error: "invalid_grant", message: "that sign-in is no longer valid, sign in again" }, 401, NO_STORE)
      : json({ error: "invalid_grant", message: "that sign-in code isn't valid, start again" }, 400, NO_STORE);
  }
  console.error("token request failed", res.status, code);
  return res.status >= 500 ? json(UNAVAILABLE, 502, NO_STORE) : json({ error: code || "invalid_request", message: "sign-in failed, start again" }, 400, NO_STORE);
}
