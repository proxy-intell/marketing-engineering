import test from "node:test";
import assert from "node:assert/strict";
import { validateVote, score, proposalKey, ranksFor, matchSetups } from "../src/votes.js";

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
  assert.match(BADGE_SVG, /<title>Listed on Marketing Engineering, ranked by use<\/title>/);
  assert.ok(BADGE_SVG.endsWith("</svg>"));
});

test("proposals accept kind and install, reject bad ones", () => {
  const base = { v: 1, install_id: "3f1b8c0e-9d2a", proposals: [{ name: "X", url: "https://x.dev", description: "d.", category: "Coding agents", usage: "weekly", kind: "skill", install: "npx skills add x" }] };
  assert.equal(validateVote(base).vote.proposals[0].kind, "skill");
  assert.equal(validateVote(base).vote.proposals[0].install, "npx skills add x");
  assert.ok(validateVote({ ...base, proposals: [{ ...base.proposals[0], kind: "virus" }] }).error);
  assert.ok(validateVote({ ...base, proposals: [{ ...base.proposals[0], install: "a\nb" }] }).error);
});

test("ranksFor: overall rank of the voter's tools, ties shared, best first, capped", () => {
  const tools = { a: { score: 9 }, b: { score: 5 }, c: { score: 5 }, d: { score: 1 }, e: { score: 0.5 } };
  assert.deepEqual(ranksFor(tools, ["d", "c", "b", "zzz"]), [{ slug: "b", rank: 2 }, { slug: "c", rank: 2 }, { slug: "d", rank: 4 }]);
  assert.deepEqual(ranksFor(tools, ["e", "d", "b", "a"], 2), [{ slug: "a", rank: 1 }, { slug: "b", rank: 2 }]);
  assert.deepEqual(ranksFor(tools, []), []);
});

const S = [
  { slug: "aeo", job: "get cited in AI search", steps: [{ tool: "a" }, { tool: "b" }] },
  { slug: "launch", job: "launch day", steps: [{ tool: "c" }, { tool: "d" }, { tool: "e" }] },
];
const row = (slugs, updated_at = 1000) => ({ updated_at, payload: { tools: slugs.map((slug) => ({ slug, usage: "installed" })), proposals: [] } });

test("score counts voters who have every tool in a setup", () => {
  const out = score([row(["a", "b", "x"]), row(["a"]), row(["a", "b"])], 2000, S);
  assert.deepEqual(out.setups, { aeo: { voters: 2 }, launch: { voters: 0 } });
});

test("score ignores expired votes for setups and defaults to no setups", () => {
  const old = row(["a", "b"], 0);
  assert.deepEqual(score([old], 91 * 86400000, S).setups, { aeo: { voters: 0 }, launch: { voters: 0 } });
  assert.deepEqual(score([row(["a", "b"])], 2000).setups, {});
});

test("matchSetups lists setups the voter touches, closest first", () => {
  const tools = [{ slug: "a", usage: "daily" }, { slug: "b", usage: "installed" }, { slug: "c", usage: "weekly" }];
  assert.deepEqual(matchSetups(tools, S), [
    { slug: "aeo", job: "get cited in AI search", have: 2, of: 2, missing: [] },
    { slug: "launch", job: "launch day", have: 1, of: 3, missing: ["d", "e"] },
  ]);
});

test("matchSetups returns nothing for no tools or no overlap", () => {
  assert.deepEqual(matchSetups([], S), []);
  assert.deepEqual(matchSetups([{ slug: "zzz", usage: "daily" }], S), []);
  assert.deepEqual(matchSetups([{ slug: "a", usage: "daily" }], []), []);
});

test("a proposal may be kind data", () => {
  const p = { name: "X", url: "https://x.com", description: "d.", category: "C", usage: "daily", kind: "data" };
  assert.equal(validateVote(ok({ proposals: [p] })).vote.proposals[0].kind, "data");
});
