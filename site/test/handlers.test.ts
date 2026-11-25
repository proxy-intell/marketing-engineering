import test from "node:test";
import assert from "node:assert/strict";
import type { Sql } from "postgres";
import { env } from "../lib/env";
import * as h from "../lib/handlers";

const realFetch = globalThis.fetch;
test.after(() => { globalThis.fetch = realFetch; });

const CATALOG = { products: [
  { slug: "a", name: "Alpha", url: "https://a.dev", description: "Does a.", category: "C" },
  { slug: "b", name: "Beta", url: "https://b.dev", description: "Does b.", category: "C" },
  { slug: "c", name: "Gamma", url: "https://c.dev", description: "Does c.", category: "C" },
] };
const SETUPS = { setups: [
  { slug: "ab", job: "do ab", steps: [{ tool: "a", why: "first" }, { tool: "b", why: "then" }] },
  { slug: "bc", job: "do bc", steps: [{ tool: "b", why: "first" }, { tool: "c", why: "then" }] },
] };
const votes = [{ updated_at: String(Date.now()), payload: JSON.stringify({ tools: [{ slug: "a", usage: "daily" }, { slug: "b", usage: "daily" }], proposals: [] }) }];
// Stub sql: the votes query gets the rows above, everything else one row ({ n: 1 }: rate count, "install exists").
const stub = async (strings: TemplateStringsArray) => (strings.join("?").includes("SELECT updated_at, payload") ? votes : [{ n: 1 }]);
const sql = Object.assign(stub, { begin: async (fn: (tx: unknown) => unknown) => fn(sql) }) as unknown as Sql;
const serve = (setups: Response) => { globalThis.fetch = (async (u: string) => String(u).endsWith("setups.json") ? setups : new Response(JSON.stringify(CATALOG))) as typeof fetch; };
const req = (path: string, init?: RequestInit) => new Request("https://marketingengineering.dev" + path, init);
const vote = (tools: unknown) => h.vote(req("/v1/vote", { method: "POST", body: JSON.stringify({ v: 1, install_id: "3f1b8c0e-9d2a", agent: "claude-code", tools }) }), sql);

test("scores include voters per setup", async () => {
  serve(new Response(JSON.stringify(SETUPS)));
  assert.deepEqual((await (await h.scores(sql)).json()).setups, { ab: { voters: 1 }, bc: { voters: 0 } });
});

test("a vote response lists the voter's setups with missing tool names", async () => {
  serve(new Response(JSON.stringify(SETUPS)));
  const body = await (await vote([{ slug: "a", usage: "daily" }, { slug: "b", usage: "weekly" }])).json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.setups, [
    { slug: "ab", job: "do ab", have: 2, of: 2, missing: [] },
    { slug: "bc", job: "do bc", have: 1, of: 2, missing: ["Gamma"] },
  ]);
});

test("a vote response says where the voter stands", async () => {
  serve(new Response(JSON.stringify(SETUPS)));
  const body = await (await vote([{ slug: "a", usage: "daily" }])).json();
  assert.equal(body.new, false); // the stub DB already has this install
  assert.equal(body.voters, 1);
  assert.deepEqual(body.ranks, [{ slug: "a", rank: 1 }]);
});

const quiet = async (fn: () => Promise<void>) => { const e = console.error; console.error = () => {}; try { await fn(); } finally { console.error = e; } };

test("setups.json down or broken never fails a vote, the scores or the page", () => quiet(async () => {
  for (const broken of [new Response("nope", { status: 502 }), new Response("{not json")]) {
    serve(broken.clone());
    const v = await vote([{ slug: "a", usage: "daily" }]);
    assert.equal(v.status, 200);
    assert.deepEqual((await v.json()).setups, []);
    serve(broken.clone());
    assert.deepEqual((await (await h.scores(sql)).json()).setups, {});
    serve(broken.clone());
    assert.equal((await h.home(sql)).status, 200);
  }
}));

test("a throwing fetch never fails a vote", () => quiet(async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  const v = await vote([{ slug: "a", usage: "daily" }]);
  assert.equal(v.status, 200);
  assert.deepEqual((await v.json()).setups, []);
}));

test("a failed catalog fetch gives setups: []", () => quiet(async () => {
  globalThis.fetch = (async (u: string) => String(u).endsWith("setups.json") ? new Response(JSON.stringify(SETUPS)) : new Response("no", { status: 502 })) as typeof fetch;
  assert.deepEqual((await (await vote([{ slug: "a", usage: "daily" }])).json()).setups, []);
}));

test("a setup naming a tool not in the catalog never reaches a vote reply", async () => {
  serve(new Response(JSON.stringify({ setups: [...SETUPS.setups, { slug: "az", job: "do az", steps: [{ tool: "a", why: "x" }, { tool: "zzz", why: "y" }] }] })));
  const body = await (await vote([{ slug: "a", usage: "daily" }, { slug: "b", usage: "daily" }])).json();
  assert.deepEqual(body.setups.map((s: { slug: string }) => s.slug), ["ab", "bc"]);
});

test("a vote reply holds at most 3 setups", async () => {
  const steps = [{ tool: "a", why: "x" }, { tool: "b", why: "y" }];
  serve(new Response(JSON.stringify({ setups: ["s1", "s2", "s3", "s4"].map((slug) => ({ slug, job: slug, steps })) })));
  const body = await (await vote([{ slug: "a", usage: "daily" }, { slug: "b", usage: "daily" }])).json();
  assert.equal(body.setups.length, 3);
});

test("setup page: a throwing catalog fetch is a 502", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.equal((await h.setupMd(req("/setups/ab.md"))).status, 502);
});

test("setup pages: known slug is markdown, unknown or odd slug is 404", async () => {
  serve(new Response(JSON.stringify(SETUPS)));
  const ok = await h.setupMd(req("/setups/ab.md"));
  assert.equal(ok.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.match(await ok.text(), /# Set up: do ab/);
  for (const path of ["/setups/nope.md", "/setups/..%2Fx.md", "/setups/a/b.md", "/setups/.md"]) {
    serve(new Response(JSON.stringify(SETUPS)));
    assert.equal((await h.setupMd(req(path))).status, 404, path);
  }
});

test("a vote and an agent fetch each send a PostHog event", async () => {
  env.POSTHOG_KEY = "phc_test";
  const sent: { event: string; distinct_id: string; properties: Record<string, unknown> }[] = [];
  globalThis.fetch = (async (u: string, init?: RequestInit) => {
    if (String(u).includes("posthog.com")) { sent.push(JSON.parse(String(init?.body))); return new Response("{}"); }
    return String(u).endsWith("setups.json") ? new Response(JSON.stringify(SETUPS)) : new Response("# vote");
  }) as typeof fetch;
  await vote([{ slug: "a", usage: "daily" }]);
  await h.voteMd(req("/vote.md"));
  env.POSTHOG_KEY = "";
  assert.deepEqual(sent.map((e) => e.event), ["vote_submitted", "agent_page_fetched"]);
  assert.equal(sent[0].distinct_id, "3f1b8c0e-9d2a");
  assert.equal(sent[1].properties.kind, "vote.md");
});

test("no PostHog key sends no events", async () => {
  let calls = 0;
  globalThis.fetch = (async () => { calls++; return new Response("# vote"); }) as typeof fetch;
  await h.voteMd(req("/vote.md"));
  assert.equal(calls, 1); // just vote.md from GitHub
});

test("an oversized body is refused before it is read", async () => {
  const big = { "content-length": "50000000", "content-type": "application/json" };
  let read = false;
  const body = new ReadableStream({ pull() { read = true; } }, { highWaterMark: 0 }); // no pull until someone reads
  const r = await h.vote(new Request("https://marketingengineering.dev/v1/vote", { method: "POST", headers: big, body, duplex: "half" } as RequestInit), sql);
  assert.equal(r.status, 413);
  assert.equal(read, false);
  assert.equal((await h.subscribe(req("/v1/subscribe", { method: "POST", headers: { "content-length": "5000" }, body: "x".repeat(5000) }), sql)).status, 413);
});
