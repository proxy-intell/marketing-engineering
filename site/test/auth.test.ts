// Sign-in: off by default, the web code flow, bearer verification, the device-flow proxy and the return-target check.
// The tenant is a stubbed fetch with an in-test RS256 key, so nothing leaves the machine.
import test from "node:test";
import assert from "node:assert/strict";
import type { Sql } from "postgres";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { env } from "../lib/env";
import * as h from "../lib/handlers";
import { safeReturnTo } from "../lib/auth";
import { nav } from "../lib/layout";
import { renderLeaderboard } from "../lib/leaderboard";

const realFetch = globalThis.fetch;
const DOMAIN = "tenant.example";
const ISS = `https://${DOMAIN}/`;
const ON = {
  AUTH0_DOMAIN: DOMAIN, AUTH0_CLIENT_ID: "web-client", AUTH0_CLIENT_SECRET: "web-secret", AUTH0_CLI_CLIENT_ID: "cli-client",
  AUTH0_AUDIENCE: "https://api.test/", AUTH_SESSION_SECRET: "x".repeat(40),
};
const OFF = Object.fromEntries(Object.keys(ON).map((k) => [k, ""]));
const enable = () => Object.assign(env, ON);
const disable = () => Object.assign(env, OFF);
test.afterEach(() => { disable(); globalThis.fetch = realFetch; });

const keys = generateKeyPair("RS256");
const JWKS = keys.then(async ({ publicKey }) => ({ keys: [{ ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" }] }));
const sign = async (claims: Record<string, unknown>, { aud = ON.AUTH0_AUDIENCE, iss = ISS, exp = "1h" as string | number } = {}) =>
  new SignJWT(claims).setProtectedHeader({ alg: "RS256", kid: "k1" }).setIssuer(iss).setAudience(aud).setSubject("auth0|abc").setIssuedAt().setExpirationTime(exp).sign((await keys).privateKey);

type Call = { url: string; body: string; headers: Headers };
// Stub tenant: JWKS always, the rest from `routes` (path -> response). Records every call.
function tenant(routes: Record<string, () => Response> = {}) {
  const calls: Call[] = [];
  globalThis.fetch = (async (u: string | URL, init?: RequestInit) => {
    const url = new URL(String(u));
    calls.push({ url: String(u), body: String(init?.body ?? ""), headers: new Headers(init?.headers) });
    if (url.host === DOMAIN && url.pathname === "/.well-known/jwks.json") return new Response(JSON.stringify(await JWKS));
    if (url.host === DOMAIN && routes[url.pathname]) return routes[url.pathname]();
    if (url.host.includes("posthog")) return new Response("{}");
    return new Response("not stubbed", { status: 500 });
  }) as typeof fetch;
  return calls;
}
const reply = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// Stub sql: the rate counter returns `n`, and every query's values are kept so tests can see the bucket.
function stubSql(n = 1) {
  const seen: unknown[][] = [];
  const fn = async (_s: TemplateStringsArray, ...values: unknown[]) => { seen.push(values); return [{ n }]; };
  return { sql: fn as unknown as Sql, seen };
}
const SITE = "https://marketingengineering.dev";
const req = (path: string, init?: RequestInit) => new Request(SITE + path, init);
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  req(path, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
const cookieOf = (res: Response, name: string) => res.headers.getSetCookie().find((c) => c.startsWith(name + "="))!.split(";")[0];

// ---- off by default ----

test("with no Auth0 config every auth route is a 404 and /v1/me says signed out", async () => {
  disable();
  const { sql } = stubSql();
  for (const r of [h.authLogin(req("/auth/login")), h.authCallback(req("/auth/callback?code=a&state=b")), h.authLogout(post("/auth/logout", "", { origin: SITE })),
    h.authDevice(post("/v1/auth/device", {}), sql), h.authToken(post("/v1/auth/token", { device_code: "d" }), sql)]) {
    const res = await r;
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "not found" });
  }
  const me = await h.me(req("/v1/me", { headers: { authorization: "Bearer whatever" } }));
  assert.equal(me.status, 200);
  assert.deepEqual(await me.json(), { signed_in: false });
  assert.equal(me.headers.get("cache-control"), "no-store");
});

test("half-configured is still off", async () => {
  Object.assign(env, { ...ON, AUTH0_CLIENT_SECRET: "" });
  assert.equal((await h.authLogin(req("/auth/login"))).status, 404);
  Object.assign(env, { ...ON, AUTH_SESSION_SECRET: "too-short" });
  assert.equal((await h.authLogin(req("/auth/login"))).status, 404);
});

test("the header has a sign-in link only when sign-in is on, and the page keeps its script count", () => {
  disable();
  assert.doesNotMatch(nav(), /sign in|\/auth\/|\/v1\/me/);
  const page = () => renderLeaderboard([{ slug: "x", name: "X", url: "https://x.co", category: "C", description: "d." }], { voters: 0, tools: {} });
  assert.equal(page().match(/<\/script>/g)!.length, 4);
  enable();
  assert.match(nav(), /<a class="sil" id="siIn" href="\/auth\/login">sign in<\/a><button type="button" class="signup" id="suOpen">sign up<\/button>/);
  assert.match(nav(), /fetch\("\/v1\/me"/);
  assert.equal(page().match(/<\/script>/g)!.length, 4);
  assert.doesNotMatch(nav(), new RegExp(DOMAIN)); // the tenant never reaches the page
});

// ---- return target ----

test("returnTo: only /, /v and their query or hash", () => {
  for (const ok of ["/", "/v", "/#setups", "/?x=1", "/v?t=proxy:daily&a=claude-code", "/v#top"]) assert.equal(safeReturnTo(ok), ok, ok);
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "/\\/evil", "\\\\evil", "/v1/me", "/vote.md", "/auth/login", "evil", "",
    "/\u0000", "/#a\nb", "/?\tx", "/#\u0085", "/v\r\n//evil", "javascript:alert(1)", "/" + "a".repeat(3000), null, 5, undefined]) {
    assert.equal(safeReturnTo(bad), "/", JSON.stringify(bad));
  }
});

// ---- web sign-in ----

async function login(returnTo: string) {
  const res = await h.authLogin(req("/auth/login?returnTo=" + encodeURIComponent(returnTo)));
  const loc = new URL(res.headers.get("location")!);
  return { res, loc, tx: cookieOf(res, "me_auth_tx") };
}

test("login sends the browser to the tenant with PKCE, state and nonce, and keeps them in an encrypted cookie", async () => {
  enable();
  const { res, loc, tx } = await login("/v?t=a:daily");
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(loc.origin + loc.pathname, `https://${DOMAIN}/authorize`);
  assert.equal(loc.searchParams.get("client_id"), "web-client");
  assert.equal(loc.searchParams.get("redirect_uri"), `${SITE}/auth/callback`);
  assert.equal(loc.searchParams.get("code_challenge_method"), "S256");
  assert.ok(loc.searchParams.get("state") && loc.searchParams.get("nonce") && loc.searchParams.get("code_challenge"));
  const set = res.headers.getSetCookie()[0];
  assert.match(set, /HttpOnly/); assert.match(set, /SameSite=Lax/); assert.match(set, /Secure/); assert.match(set, /Path=\/auth/);
  assert.doesNotMatch(tx, /verifier|daily/); // sealed, not readable
});

test("localhost gets an http redirect_uri and a cookie without Secure", async () => {
  enable();
  const res = await h.authLogin(new Request("http://localhost:3000/auth/login"));
  assert.equal(new URL(res.headers.get("location")!).searchParams.get("redirect_uri"), "http://localhost:3000/auth/callback");
  assert.doesNotMatch(res.headers.getSetCookie()[0], /Secure/);
});

test("callback: code + verifier swapped, id token verified, session set, back to returnTo, signed_in sent to PostHog without the email", async () => {
  enable();
  env.POSTHOG_KEY = "phc_test";
  try {
    const { loc, tx } = await login("/v?t=a:daily");
    const nonce = loc.searchParams.get("nonce")!, state = loc.searchParams.get("state")!;
    const idToken = await sign({ nonce, email: "Ada@Example.com", email_verified: true }, { aud: "web-client" });
    const calls = tenant({ "/oauth/token": reply(200, { id_token: idToken, access_token: "at" }) });
    const res = await h.authCallback(req(`/auth/callback?code=c0de&state=${state}`, { headers: { cookie: tx } }));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/v?t=a:daily");
    const form = new URLSearchParams(calls.find((c) => c.url.endsWith("/oauth/token"))!.body);
    assert.equal(form.get("grant_type"), "authorization_code");
    assert.equal(form.get("code"), "c0de");
    assert.ok(form.get("code_verifier"));
    const session = cookieOf(res, "me_session");
    assert.match(res.headers.getSetCookie().find((c) => c.startsWith("me_auth_tx="))!, /Max-Age=0/);
    const me = await h.me(req("/v1/me", { headers: { cookie: session } }));
    assert.deepEqual(await me.json(), { signed_in: true, email: "ada@example.com", sub: "auth0|abc" });
    assert.equal(me.headers.get("cache-control"), "no-store");
    await new Promise((r) => setTimeout(r, 10));
    const ev = calls.filter((c) => c.url.includes("posthog")).map((c) => JSON.parse(c.body));
    assert.equal(ev.length, 1);
    assert.equal(ev[0].event, "signed_in");
    assert.equal(ev[0].distinct_id, "auth0|abc");
    assert.doesNotMatch(JSON.stringify(ev[0]), /example\.com/i);
  } finally {
    env.POSTHOG_KEY = "";
  }
});

test("callback refuses a wrong state, a missing cookie, a wrong nonce and a token for another client", async () => {
  enable();
  const { loc, tx } = await login("/");
  const nonce = loc.searchParams.get("nonce")!, state = loc.searchParams.get("state")!;
  tenant({ "/oauth/token": reply(200, { id_token: await sign({ nonce }, { aud: "web-client" }) }) });
  assert.equal((await h.authCallback(req(`/auth/callback?code=c&state=nope`, { headers: { cookie: tx } }))).status, 400);
  assert.equal((await h.authCallback(req(`/auth/callback?code=c&state=${state}`))).status, 400);
  assert.equal((await h.authCallback(req(`/auth/callback?code=c&state=${state}`, { headers: { cookie: "me_auth_tx=garbage" } }))).status, 400);
  const quiet = console.error; console.error = () => {};
  try {
    for (const idToken of [await sign({ nonce: "other" }, { aud: "web-client" }), await sign({ nonce }, { aud: "someone-else" })]) {
      tenant({ "/oauth/token": reply(200, { id_token: idToken }) });
      const res = await h.authCallback(req(`/auth/callback?code=c&state=${state}`, { headers: { cookie: tx } }));
      assert.equal(res.status, 502);
      assert.equal(res.headers.getSetCookie().some((c) => c.startsWith("me_session=")), false);
    }
    tenant({ "/oauth/token": reply(403, { error: "invalid_grant" }) });
    assert.equal((await h.authCallback(req(`/auth/callback?code=c&state=${state}`, { headers: { cookie: tx } }))).status, 502);
  } finally { console.error = quiet; }
});

test("cancelling at the tenant goes back to returnTo, still signed out", async () => {
  enable();
  const { tx } = await login("/#rank");
  const res = await h.authCallback(req(`/auth/callback?error=access_denied&state=x`, { headers: { cookie: tx } }));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/#rank");
  assert.equal(res.headers.getSetCookie().some((c) => c.startsWith("me_session=")), false);
});

test("a forged or foreign cookie is just signed out", async () => {
  enable();
  const { tx } = await login("/");
  for (const cookie of ["me_session=abc", "me_session=" + tx.split("=")[1]]) { // a tx cookie can't pass as a session
    assert.deepEqual(await (await h.me(req("/v1/me", { headers: { cookie } }))).json(), { signed_in: false });
  }
});

test("logout: same-origin POST clears the session; a foreign or missing Origin is refused", async () => {
  enable();
  for (const origin of ["https://evil.example", "null", "http://marketingengineering.dev", undefined]) {
    const res = await h.authLogout(req("/auth/logout", { method: "POST", headers: origin ? { origin } : {} }));
    assert.equal(res.status, 403, String(origin));
    assert.equal(res.headers.getSetCookie().length, 0);
  }
  const res = await h.authLogout(req("/auth/logout", { method: "POST", headers: { origin: SITE } }));
  assert.equal(res.status, 303);
  assert.match(res.headers.getSetCookie()[0], /^me_session=; .*Max-Age=0/);
  const to = new URL(res.headers.get("location")!);
  assert.equal(to.pathname, "/v2/logout");
  assert.equal(to.searchParams.get("returnTo"), `${SITE}/`);
});

// ---- bearer tokens ----

const meWith = (token: string) => h.me(req("/v1/me", { headers: { authorization: `Bearer ${token}` } }));

test("a valid access token is signed in, email from the namespaced claim", async () => {
  enable();
  const calls = tenant();
  const res = await meWith(await sign({ "https://marketingengineering.dev/email": "ada@example.com" }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { signed_in: true, email: "ada@example.com", sub: "auth0|abc" });
  assert.equal(calls.some((c) => c.url.endsWith("/userinfo")), false);
});

test("without the claim the email comes from /userinfo, asked once and cached", async () => {
  enable();
  const calls = tenant({ "/userinfo": reply(200, { sub: "auth0|abc", email: "ada@example.com", email_verified: true }) });
  const token = await sign({ scope: "openid email" });
  for (let i = 0; i < 3; i++) assert.equal((await (await meWith(token)).json()).email, "ada@example.com");
  assert.equal(calls.filter((c) => c.url.endsWith("/userinfo")).length, 1);
});

test("wrong audience, wrong issuer, expired, HS256, none and garbage are all 401", async () => {
  enable();
  tenant();
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const claims = { sub: "auth0|abc", iss: ISS, aud: ON.AUTH0_AUDIENCE, exp: Math.floor(Date.now() / 1000) + 3600 };
  const bad = [
    await sign({}, { aud: "https://other.api/" }),
    await sign({}, { iss: "https://evil.example/" }),
    await sign({}, { exp: Math.floor(Date.now() / 1000) - 60 }),
    await new SignJWT(claims).setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("x".repeat(40))),
    `${b64({ alg: "none", typ: "JWT" })}.${b64(claims)}.`,
    "not.a.jwt", "garbage",
  ];
  for (const token of bad) {
    const res = await meWith(token);
    assert.equal(res.status, 401, token);
    assert.equal((await res.json()).signed_in, false);
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
});

// ---- device flow proxy ----

test("device: asks the tenant with the CLI client, audience and scopes, and passes the codes through", async () => {
  enable();
  const { sql, seen } = stubSql();
  const calls = tenant({ "/oauth/device/code": reply(200, {
    device_code: "dev-123", user_code: "ABCD-EFGH", verification_uri: `https://${DOMAIN}/activate`,
    verification_uri_complete: `https://${DOMAIN}/activate?user_code=ABCD-EFGH`, interval: 5, expires_in: 900,
  }) });
  const res = await h.authDevice(post("/v1/auth/device", ""), sql);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), {
    device_code: "dev-123", user_code: "ABCD-EFGH", verification_uri: `https://${DOMAIN}/activate`,
    verification_uri_complete: `https://${DOMAIN}/activate?user_code=ABCD-EFGH`, interval: 5, expires_in: 900,
  });
  const form = new URLSearchParams(calls[0].body);
  assert.equal(form.get("client_id"), "cli-client");
  assert.equal(form.get("audience"), ON.AUTH0_AUDIENCE);
  assert.equal(form.get("scope"), "openid email offline_access");
  assert.match(String(seen[0][1]), /^auth:\d{4}-\d{2}-\d{2}T\d{2}$/); // its own counter, never the vote one
});

test("token: success passes through the tokens, nothing else", async () => {
  enable();
  const { sql } = stubSql();
  const access = await sign({});
  const calls = tenant({ "/oauth/token": reply(200, { access_token: access, refresh_token: "rt-1", id_token: "idt", expires_in: 86400, token_type: "Bearer", scope: "openid" }) });
  const res = await h.authToken(post("/v1/auth/token", { device_code: "dev-123" }), sql);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { access_token: access, refresh_token: "rt-1", expires_in: 86400, token_type: "Bearer" });
  const form = new URLSearchParams(calls[0].body);
  assert.equal(form.get("grant_type"), "urn:ietf:params:oauth:grant-type:device_code");
  assert.equal(form.get("client_id"), "cli-client");
  assert.equal(form.get("client_secret"), null);
});

test("token: refresh uses the refresh_token grant; a revoked one is a 401", async () => {
  enable();
  const { sql } = stubSql();
  const calls = tenant({ "/oauth/token": reply(200, { access_token: "new", expires_in: 86400 }) });
  assert.equal((await h.authToken(post("/v1/auth/token", { refresh_token: "rt-1" }), sql)).status, 200);
  assert.equal(new URLSearchParams(calls[0].body).get("grant_type"), "refresh_token");
  tenant({ "/oauth/token": reply(403, { error: "invalid_grant" }) });
  assert.equal((await h.authToken(post("/v1/auth/token", { refresh_token: "rt-1" }), sql)).status, 401);
});

test("token: pending, slow_down, expired and denied come back as their own errors", async () => {
  enable();
  const { sql } = stubSql();
  for (const [error, status] of [["authorization_pending", 428], ["slow_down", 429], ["expired_token", 410], ["access_denied", 403]] as const) {
    tenant({ "/oauth/token": reply(error === "slow_down" ? 429 : 403, { error, error_description: "tenant text" }) });
    const res = await h.authToken(post("/v1/auth/token", { device_code: "dev-123" }), sql);
    assert.equal(res.status, status, error);
    assert.equal(res.headers.get("cache-control"), "no-store");
    const body = await res.json();
    assert.equal(body.error, error);
    assert.ok(body.message);
  }
});

test("token: bad bodies are 400, a tenant outage is a 502", async () => {
  enable();
  const { sql } = stubSql();
  for (const b of ["{nope", "[]", {}, { device_code: 5 }, { device_code: "a", refresh_token: "b" }, { device_code: "x".repeat(2001) }]) {
    assert.equal((await h.authToken(post("/v1/auth/token", b), sql)).status, 400, JSON.stringify(b));
  }
  const quiet = console.error; console.error = () => {};
  try {
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal((await h.authToken(post("/v1/auth/token", { device_code: "d" }), sql)).status, 502);
    assert.equal((await h.authDevice(post("/v1/auth/device", {}), sql)).status, 502);
    tenant({ "/oauth/token": reply(503, {}) });
    assert.equal((await h.authToken(post("/v1/auth/token", { device_code: "d" }), sql)).status, 502);
  } finally { console.error = quiet; }
});

test("device and token: the per-IP sign-in limit kicks in, before the tenant is asked", async () => {
  enable();
  const { sql } = stubSql(301);
  const calls = tenant();
  for (const res of [await h.authDevice(post("/v1/auth/device", {}), sql), await h.authToken(post("/v1/auth/token", { device_code: "d" }), sql)]) {
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error, "rate_limited");
    assert.equal(res.headers.get("cache-control"), "no-store");
  }
  assert.equal(calls.length, 0);
});

test("device and token: an oversized body is refused before it is read", async () => {
  enable();
  const { sql, seen } = stubSql();
  for (const [fn, path] of [[h.authDevice, "/v1/auth/device"], [h.authToken, "/v1/auth/token"]] as const) {
    let read = false;
    const body = new ReadableStream({ pull() { read = true; } }, { highWaterMark: 0 });
    const res = await fn(new Request(SITE + path, { method: "POST", headers: { "content-length": "50000000" }, body, duplex: "half" } as RequestInit), sql);
    assert.equal(res.status, 413);
    assert.equal(read, false);
    assert.equal((await fn(post(path, "x".repeat(5000)), sql)).status, 413);
  }
  assert.equal(seen.length, 0); // never counted, never sent
});
