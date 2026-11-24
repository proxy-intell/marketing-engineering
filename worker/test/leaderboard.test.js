import test from "node:test";
import assert from "node:assert/strict";
import { renderLeaderboard } from "../src/leaderboard.js";

test("embeds catalog + scores as JSON a tool name cannot break out of", () => {
  const html = renderLeaderboard(
    [{ slug: "x", name: "X</script><b>", url: "https://x.co", category: "Email sending", description: "d.", kind: "skill" }],
    { voters: 2, tools: { x: { score: 3, voters: 2 } } },
  );
  const data = JSON.parse(html.match(/<script type="application\/json" id="data">(.*?)<\/script>/s)[1]);
  assert.deepEqual(data.rows[0], { slug: "x", name: "X</script><b>", url: "https://x.co", cat: "Email sending", desc: "d.", kind: "skill", score: 3, voters: 2 });
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
