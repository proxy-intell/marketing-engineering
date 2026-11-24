import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

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
const votes = [{ updated_at: Date.now(), payload: JSON.stringify({ tools: [{ slug: "a", usage: "daily" }, { slug: "b", usage: "daily" }], proposals: [] }) }];
const stmt = { bind() { return this; }, async all() { return { results: votes }; }, async first() { return { n: 1 }; }, async run() {} };
const env = { DB: { prepare: () => stmt, async batch() {} } };
const ctx = { waitUntil() {} };
const serve = (setups) => { globalThis.fetch = async (u) => String(u).endsWith("setups.json") ? setups : new Response(JSON.stringify(CATALOG)); };
const get = (path) => worker.fetch(new Request("https://marketingengineering.dev" + path), env, ctx);
const vote = (tools) => worker.fetch(new Request("https://marketingengineering.dev/v1/vote", { method: "POST", body: JSON.stringify({ v: 1, install_id: "3f1b8c0e-9d2a", agent: "claude-code", tools }) }), env, ctx);

test("scores include voters per setup", async () => {
  serve(new Response(JSON.stringify(SETUPS)));
  assert.deepEqual((await (await get("/v1/scores")).json()).setups, { ab: { voters: 1 }, bc: { voters: 0 } });
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

const quiet = async (fn) => { const e = console.error; console.error = () => {}; try { await fn(); } finally { console.error = e; } };

test("setups.json down or broken never fails a vote, the scores or the page", () => quiet(async () => {
  for (const broken of [new Response("nope", { status: 502 }), new Response("{not json")]) {
    serve(broken.clone());
    const v = await vote([{ slug: "a", usage: "daily" }]);
    assert.equal(v.status, 200);
    assert.deepEqual((await v.json()).setups, []);
    serve(broken.clone());
    assert.deepEqual((await (await get("/v1/scores")).json()).setups, {});
    serve(broken.clone());
    assert.equal((await get("/")).status, 200);
  }
}));

test("a throwing fetch never fails a vote", () => quiet(async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  const v = await vote([{ slug: "a", usage: "daily" }]);
  assert.equal(v.status, 200);
  assert.deepEqual((await v.json()).setups, []);
}));

test("a failed catalog fetch gives setups: []", () => quiet(async () => {
  globalThis.fetch = async (u) => String(u).endsWith("setups.json") ? new Response(JSON.stringify(SETUPS)) : new Response("no", { status: 502 });
  assert.deepEqual((await (await vote([{ slug: "a", usage: "daily" }])).json()).setups, []);
}));

test("a setup naming a tool not in the catalog never reaches a vote reply", async () => {
  serve(new Response(JSON.stringify({ setups: [...SETUPS.setups, { slug: "az", job: "do az", steps: [{ tool: "a", why: "x" }, { tool: "zzz", why: "y" }] }] })));
  const body = await (await vote([{ slug: "a", usage: "daily" }, { slug: "b", usage: "daily" }])).json();
  assert.deepEqual(body.setups.map((s) => s.slug), ["ab", "bc"]);
});

test("a vote reply holds at most 3 setups", async () => {
  const steps = [{ tool: "a", why: "x" }, { tool: "b", why: "y" }];
  serve(new Response(JSON.stringify({ setups: ["s1", "s2", "s3", "s4"].map((slug) => ({ slug, job: slug, steps })) })));
  const body = await (await vote([{ slug: "a", usage: "daily" }, { slug: "b", usage: "daily" }])).json();
  assert.equal(body.setups.length, 3);
});

test("setup page: a throwing catalog fetch is a 502", async () => {
  globalThis.fetch = async () => { throw new Error("offline"); };
  assert.equal((await get("/setups/ab.md")).status, 502);
});

test("setup pages: known slug is markdown, unknown or odd slug is 404", async () => {
  serve(new Response(JSON.stringify(SETUPS)));
  const ok = await get("/setups/ab.md");
  assert.equal(ok.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.match(await ok.text(), /# Set up: do ab/);
  for (const path of ["/setups/nope.md", "/setups/..%2Fx.md", "/setups/a/b.md", "/setups/.md"]) {
    serve(new Response(JSON.stringify(SETUPS)));
    assert.equal((await get(path)).status, 404, path);
  }
});
