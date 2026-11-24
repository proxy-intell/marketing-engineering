import test from "node:test";
import assert from "node:assert/strict";
import { validateVote, score, proposalKey } from "../src/votes.js";

const ok = (over = {}) => ({ v: 1, install_id: "3f1b8c0e-9d2a", agent: "claude-code", tools: [{ slug: "posthog", usage: "daily" }], ...over });

test("accepts a minimal vote", () => {
  const { vote, error } = validateVote(ok());
  assert.equal(error, undefined);
  assert.equal(vote.agent, "claude-code");
  assert.equal(vote.weekly_drop, false);
});

test("rejects bad shapes", () => {
  for (const bad of [
    null,
    ok({ v: 2 }),
    ok({ install_id: "x" }),
    ok({ tools: [] }),
    ok({ tools: [{ slug: "Bad Slug", usage: "daily" }] }),
    ok({ tools: [{ slug: "posthog", usage: "always" }] }),
    ok({ tools: [{ slug: "a", usage: "daily" }, { slug: "a", usage: "weekly" }] }),
    ok({ email: "not-an-email" }),
    ok({ tools: Array.from({ length: 41 }, (_, i) => ({ slug: `t${i}`, usage: "daily" })) }),
    ok({ proposals: [{ name: "X", url: "http://x.com", description: "d.", category: "C", usage: "daily" }] }),
  ]) {
    assert.ok(validateVote(bad).error, JSON.stringify(bad)?.slice(0, 80));
  }
});

test("unknown agent becomes other; email lowercased; weekly_drop needs an email", () => {
  assert.equal(validateVote(ok({ agent: "weird" })).vote.agent, "other");
  const v = validateVote(ok({ email: "A@B.co", weekly_drop: true })).vote;
  assert.equal(v.email, "a@b.co");
  assert.equal(v.weekly_drop, true);
  assert.equal(validateVote(ok({ weekly_drop: true })).vote.weekly_drop, false);
});

test("strips unknown fields from tools and proposals", () => {
  const v = validateVote(ok({ tools: [{ slug: "a", usage: "daily", path: "/Users/x/secret" }] })).vote;
  assert.deepEqual(v.tools, [{ slug: "a", usage: "daily" }]);
});

test("proposalKey normalises", () => {
  assert.equal(proposalKey("https://www.Foo.com/bar/"), "foo.com/bar");
  assert.equal(proposalKey("https://foo.com"), "foo.com");
});

test("score weights usage, counts voters, drops stale votes, groups proposals", () => {
  const now = Date.UTC(2026, 11, 1);
  const day = 86400000;
  const p = (slug, usage) => ({ slug, usage });
  const prop = (url, usage) => ({ name: "Foreplay", url, description: "d.", category: "Creative strategy", usage });
  const rows = [
    { updated_at: now - day, payload: { tools: [p("posthog", "daily"), p("exa", "installed")], proposals: [prop("https://foreplay.co", "weekly")] } },
    { updated_at: now - 2 * day, payload: { tools: [p("posthog", "weekly")], proposals: [prop("https://www.foreplay.co/", "daily")] } },
    { updated_at: now - 91 * day, payload: { tools: [p("posthog", "daily")], proposals: [] } },
  ];
  const s = score(rows, now);
  assert.equal(s.voters, 2);
  assert.deepEqual(s.tools.posthog, { score: 5, voters: 2 });
  assert.deepEqual(s.tools.exa, { score: 0.5, voters: 1 });
  assert.equal(s.proposals.length, 1);
  assert.equal(s.proposals[0].voters, 2);
  assert.equal(s.proposals[0].score, 5);
});

import { BADGE_SVG } from "../src/badge.js";
test("badge is a well-formed svg with an accessible name", () => {
  assert.match(BADGE_SVG, /^<svg [^>]*role="img"/);
  assert.match(BADGE_SVG, /<title>Featured on Marketing Engineering<\/title>/);
  assert.ok(BADGE_SVG.endsWith("</svg>"));
});
