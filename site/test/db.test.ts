// Real-Postgres checks for the SQL the stubs can't see: upserts, the 429, email dedupe, the once-only welcome.
// Skipped unless DATABASE_URL points at a throwaway database (CI starts one).
import test from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { SCHEMA } from "../lib/schema";
import * as h from "../lib/handlers";

const url = process.env.DATABASE_URL;
const sql = url ? postgres(url, { max: 2 }) : (null as unknown as postgres.Sql);
const realFetch = globalThis.fetch;

test.before(async () => {
  if (!url) return;
  await sql.unsafe(SCHEMA);
  await sql`TRUNCATE votes, subscribers, rate`;
  globalThis.fetch = (async () => new Response(JSON.stringify({ products: [], setups: [] }))) as typeof fetch;
});
test.after(async () => {
  globalThis.fetch = realFetch;
  if (url) await sql.end();
});

const post = (path: string, body: unknown, ip: string) =>
  new Request("https://marketingengineering.dev" + path, { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });
const ballot = (install_id: string, email?: string) => ({ v: 1, install_id, agent: "claude-code", tools: [{ slug: "a", usage: "daily" }], email, weekly_drop: Boolean(email) });

test("the 11th request from one address in a day gets a 429", { skip: !url }, async () => {
  for (let i = 0; i < 10; i++) assert.equal((await h.vote(post("/v1/vote", ballot(`rate-test-${i}`), "1.1.1.1"), sql)).status, 200);
  assert.equal((await h.vote(post("/v1/vote", ballot("rate-test-10"), "1.1.1.1"), sql)).status, 429);
  // Only the hop the load balancer saw counts; a forged left-hand hop doesn't buy a fresh bucket.
  assert.equal((await h.subscribe(post("/v1/subscribe", { email: "x@y.dev" }, "9.9.9.9, 1.1.1.1"), sql)).status, 429);
});

test("a vote with the same email from a new install replaces the old one", { skip: !url }, async () => {
  await h.vote(post("/v1/vote", ballot("dup-test-1", "dup@me.dev"), "2.2.2.2"), sql);
  await h.vote(post("/v1/vote", ballot("dup-test-2", "dup@me.dev"), "2.2.2.2"), sql);
  const rows = await sql`SELECT install_id FROM votes WHERE email_hash IS NOT NULL AND install_id LIKE 'dup-test-%'`;
  assert.deepEqual(rows.map((r) => r.install_id), ["dup-test-2"]);
});

test("subscribing twice stores one row (so the welcome goes once)", { skip: !url }, async () => {
  assert.equal((await h.subscribe(post("/v1/subscribe", { email: "Once@Me.dev" }, "3.3.3.3"), sql)).status, 200);
  assert.equal((await h.subscribe(post("/v1/subscribe", { email: "once@me.dev" }, "3.3.3.3"), sql)).status, 200);
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM subscribers WHERE email = 'once@me.dev'`;
  assert.equal(n, 1);
});
