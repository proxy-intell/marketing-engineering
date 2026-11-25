import test from "node:test";
import assert from "node:assert/strict";
import { renderWelcome } from "../src/welcome.js";

test("welcome email: one focus per variant, and a way out", () => {
  const voted = renderWelcome(), site = renderWelcome({ voted: false });
  assert.ok(voted.subject.includes("marketing engineering"));
  assert.ok(voted.text.includes("already in the ranking") && !voted.html.includes("send your vote"));
  assert.ok(site.html.includes('href="https://marketingengineering.dev"'));
  for (const part of [voted.html, voted.text, site.html, site.text]) {
    assert.ok(!part.includes("github.com"));
    assert.ok(part.includes('reply "stop"') && part.includes("Newark, DE"));
  }
});
