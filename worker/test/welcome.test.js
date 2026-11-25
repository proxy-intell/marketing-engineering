import test from "node:test";
import assert from "node:assert/strict";
import { renderWelcome } from "../src/welcome.js";

test("welcome email has the vote line, the repo link and a way out", () => {
  const { subject, html, text } = renderWelcome();
  assert.ok(subject.length > 0 && subject.length < 60);
  for (const part of [html, text]) {
    assert.ok(part.includes("vote on marketing engineering - https://marketingengineering.dev/vote.md"));
    assert.ok(part.includes("github.com/proxy-intell/marketing-engineering"));
    assert.ok(part.includes('reply "stop"'));
    assert.ok(part.includes("Newark, DE"));
  }
});
