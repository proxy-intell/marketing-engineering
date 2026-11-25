// Every route's logic. Route files under app/ pass in the request and, where needed, the db.
// Taking `sql` as an argument is what lets the tests run these with a stub.
import { createHash } from "node:crypto";
import type { Sql } from "postgres";
import { env } from "./env";
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
async function rateHit(sql: Sql, request: Request): Promise<number> {
  const day = new Date().toISOString().slice(0, 10);
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

// Vote page for agents that can't POST: they link here with ?t=slug:usage,... and the person sends it
export async function votePage() {
  const catalogRes = await raw("catalog.json");
  if (!catalogRes.ok) return json({ error: "catalog unavailable" }, 502);
  const { products } = await catalogRes.json();
  return new Response(renderVotePage(products), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
}

// Short, stable URL for agents: "vote on marketing engineering - https://marketingengineering.dev/vote.md"
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
