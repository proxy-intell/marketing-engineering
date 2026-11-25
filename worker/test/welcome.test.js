import test from "node:test";
import assert from "node:assert/strict";
import { renderWelcome } from "../src/welcome.js";

test("welcome email: one focus per variant, and a way out", () => {
  const voted = renderWelcome(), site = renderWelcome({ voted: false });
  assert.ok(voted.subject.includes("marketing engineering"));
  assert.ok(voted.text.includes("already in the ranking") && voted.html.includes("x.com/intent/post"));
  assert.ok(voted.html.includes("github.com/proxy-intell/marketing-engineering") && !site.html.includes("github.com"));
  assert.ok(site.text.includes("vote on marketing engineering - https://marketingengineering.dev/vote.md") && !voted.text.includes("vote.md"));
  for (const part of [voted.html, voted.text, site.html, site.text]) {
    assert.ok(part.includes('reply "stop"') && part.includes("Newark, DE"));
  }
});
