import test from "node:test";
import assert from "node:assert/strict";
import { renderLeaderboard } from "../src/leaderboard.js";

test("embeds catalog + scores as JSON a tool name cannot break out of", () => {
  const html = renderLeaderboard(
    [{ slug: "x", name: "X</script><b>", url: "https://x.co", category: "Email sending", description: "d.", kind: "skill" }],
    { voters: 2, tools: { x: { score: 3, voters: 2 } } },
  );
  const data = JSON.parse(html.match(/<script type="application\/json" id="data">(.*?)<\/script>/s)[1]);
  assert.deepEqual(data.rows[0], { slug: "x", name: "X</script><b>", url: "https://x.co", cat: "Email sending", desc: "d.", kind: "skill", score: 3, voters: 2, setups: 0 });
  assert.equal(data.voters, 2);
  assert.equal(html.match(/<\/script>/g).length, 2);
});

test("unvoted tools score zero", () => {
  const html = renderLeaderboard([{ slug: "y", name: "Y", url: "https://y.co", category: "C", description: "d." }], { voters: 0, tools: {} });
  assert.match(html, /"score":0,"voters":0/);
});

test("rows arrive ranked by score, then name", () => {
  const html = renderLeaderboard(
    [
      { slug: "a", name: "Alpha", url: "https://a.dev", description: "x.", category: "Google SEO" },
      { slug: "b", name: "Beta", url: "https://b.dev", description: "y.", category: "Google SEO", kind: "skill" },
      { slug: "c", name: "Gamma", url: "https://c.dev", description: "z.", category: "Google SEO" },
    ],
    { voters: 2, tools: { b: { score: 5, voters: 2 }, a: { score: 1, voters: 1 } } },
  );
  const data = JSON.parse(html.match(/<script type="application\/json" id="data">(.*?)<\/script>/s)[1]);
  assert.deepEqual(data.rows.map((r) => r.name), ["Beta", "Alpha", "Gamma"]);
  assert.equal(data.rows[0].kind, "skill");
});

const P = [
  { slug: "proxy", name: "Proxy", url: "https://useproxy.dev", description: "d.", category: "C", kind: "data" },
  { slug: "exa", name: "Exa", url: "https://exa.ai", description: "d.", category: "C" },
  { slug: "solo", name: "Solo", url: "https://s.dev", description: "d.", category: "C" },
];
const ST = [
  { slug: "one", job: "zeta job", steps: [{ tool: "proxy", why: "see ads" }, { tool: "exa", why: "find rivals" }] },
  { slug: "two", job: "alpha </script><b>", steps: [{ tool: "exa", why: "a \"quoted\" why" }, { tool: "proxy", why: "w" }] },
];
const parse = (html) => JSON.parse(html.match(/<script type="application\/json" id="data">(.*?)<\/script>/s)[1]);

test("setups are embedded, ranked by voters then job, with tool names", () => {
  const html = renderLeaderboard(P, { voters: 4, tools: {}, setups: { one: { voters: 3 }, two: { voters: 0 } } }, ST);
  const data = parse(html);
  assert.deepEqual(data.setups.map((s) => s.slug), ["one", "two"]);
  assert.deepEqual(data.setups[0].steps[0], { slug: "proxy", name: "Proxy", url: "https://useproxy.dev", why: "see ads", ours: true });
  assert.equal(data.setups[0].steps[1].ours, false);
  assert.equal(data.setups[0].voters, 3);
});

test("rows count the setups a tool is in", () => {
  const data = parse(renderLeaderboard(P, { voters: 0, tools: {} }, ST));
  const by = Object.fromEntries(data.rows.map((r) => [r.slug, r.setups]));
  assert.deepEqual(by, { proxy: 2, exa: 2, solo: 0 });
});

test("a setup job cannot break out of the page", () => {
  const html = renderLeaderboard(P, { voters: 0, tools: {} }, ST);
  assert.equal(html.match(/<\/script>/g).length, 2);
});

test("no setups means no setups section and old callers still work", () => {
  const html = renderLeaderboard(P, { voters: 0, tools: {} });
  assert.deepEqual(parse(html).setups, []);
  assert.match(html, /id="setups"[^>]*hidden/);
});

test("all setups are embedded; the show-all cut is client-side", () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ slug: "s" + i, job: "job " + i, steps: [{ tool: "proxy", why: "w" }] }));
  assert.equal(parse(renderLeaderboard(P, { voters: 0, tools: {} }, many)).setups.length, 8);
});
