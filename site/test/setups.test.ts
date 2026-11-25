import test from "node:test";
import assert from "node:assert/strict";
import { validSetups, renderSetupMd } from "../lib/setups";

const good = { slug: "aeo", job: "get cited in AI search", steps: [{ tool: "a", why: "first" }, { tool: "b", why: "then" }] };

test("validSetups survives garbage", () => {
  for (const bad of [null, undefined, "x", 3, {}, { setups: "no" }, { setups: [null, 1, { slug: "x" }] }]) {
    assert.deepEqual(validSetups(bad), []);
  }
});

test("validSetups keeps good setups and drops bad slugs", () => {
  assert.deepEqual(validSetups({ setups: [good, { ...good, slug: "../x" }] }), [good]);
});

test("validSetups drops unknown tools, then setups with under 2 steps", () => {
  const three = { ...good, slug: "t", steps: [...good.steps, { tool: "gone", why: "w" }] };
  const out = validSetups({ setups: [three, good] }, new Set(["a", "b"]));
  assert.equal(out[0].steps.length, 2);
  assert.deepEqual(validSetups({ setups: [good] }, new Set(["a"])), []);
});

test("renderSetupMd names each tool with its links and the rules", () => {
  const md = renderSetupMd(good, [
    { slug: "a", name: "Alpha", url: "https://a.dev", description: "Does a.", mcp_url: "https://a.dev/mcp", docs_url: "https://a.dev/docs" },
    { slug: "b", name: "Beta", url: "https://b.dev", description: "Does b." },
  ]);
  assert.match(md, /^---\nname: setup-aeo\n/);
  assert.match(md, /# Set up: get cited in AI search/);
  assert.match(md, /1\. \*\*Alpha\*\* \(https:\/\/a\.dev\): first/);
  assert.match(md, /MCP: https:\/\/a\.dev\/mcp/);
  assert.match(md, /Docs: https:\/\/a\.dev\/docs/);
  assert.match(md, /2\. \*\*Beta\*\*/);
  assert.match(md, /Never ask the user to paste an API key into the chat/);
  assert.match(md, /vote on marketing engineering - https:\/\/marketingengineering\.dev\/vote\.md/);
});
