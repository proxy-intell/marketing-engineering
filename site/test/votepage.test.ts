import test from "node:test";
import assert from "node:assert/strict";
import { parseVoteLink, renderVotePage } from "../lib/votepage";

test("vote link keeps listed slugs and known usage only", () => {
  const slugs = ["posthog", "resend", "exa"];
  assert.deepEqual(parseVoteLink("posthog:daily,resend:weekly", slugs), [{ slug: "posthog", usage: "daily" }, { slug: "resend", usage: "weekly" }]);
  assert.deepEqual(parseVoteLink("posthog:always,nope:daily,exa:installed,exa:daily", slugs), [{ slug: "exa", usage: "installed" }]);
  assert.deepEqual(parseVoteLink(null, slugs), []);
  assert.deepEqual(parseVoteLink("constructor:daily,__proto__:weekly", slugs), []);
});

test("vote page embeds the catalog without letting a name break out", () => {
  const html = renderVotePage([{ slug: "x", name: "X</script>", category: "C", url: "https://x.co", description: "d." }]);
  const data = html.match(/<script type="application\/json" id="data">(.*?)<\/script>/s)![1];
  assert.equal(JSON.parse(data)[0].name, "X</script>");
  assert.match(html, /X\\u003c\/script>/);
  assert.match(html, /var parseVoteLink = function parseVoteLink/);
});

test("the page's inline script is valid JavaScript", () => {
  const html = renderVotePage([{ slug: "x", name: "X", category: "C", url: "https://x.co", description: "d." }]);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(scripts.length > 0);
  for (const s of scripts) assert.doesNotThrow(() => new Function(s));
});
