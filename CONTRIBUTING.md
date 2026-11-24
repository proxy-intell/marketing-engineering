# Contributing

**Best way in: vote with your usage.** Paste [`vote.md`](vote.md) into your agent. It reports which listed tools you actually use, proposes ones we lack, and ranks the list. See [how voting works](docs/how-voting-works.md). The routes below are for adding a tool by hand.

No JSON wanted? Ask your agent: `Add <tool URL> to github.com/proxy-intell/marketing-engineering. Follow AGENTS.md and open a PR.`

## Bar for inclusion

- [ ] Useful to someone doing marketing (paid or organic) with code, agents or data.
- [ ] Live, publicly reachable, and has docs.
- [ ] Not a duplicate of an existing entry.
- [ ] Makers may submit their own product — say so in the PR.

## How to submit

1. One product per PR. Title starts with `Add <Name>`; a funny suffix is welcome.
2. Add an object to `catalog.json` `products` (fields in `catalog.schema.json`). Keep the array sorted by `slug`.
3. Run `python scripts/build.py` — regenerates `README.md` and `llms.txt`. Don't hand-edit between the `CATALOG` markers.
4. CI validates the schema, checks the generated files are current, and checks links.

## Skills and plugins

Agent skills (`SKILL.md`) and plugins for coding agents are listed like tools, with `kind: skill` or `kind: plugin`, an `install` one-liner and the `agents` they work in (`claude-code`, `cursor`, `codex`, `copilot`, `gemini`, `any`). Put each in the category of the job it does (a CRO-audit skill goes in a category like `Google SEO` or `Creative strategy`, not in a "skills" bucket).

A skill or plugin runs inside people's agents, so the bar is higher. All of these:

- Public source repo with an open license, readable (no minified or obfuscated code).
- The `install` line runs from that source and does what the README says. No `curl | sh` from a host that isn't the source.
- States what it reads and which hosts it sends data to. No credentials requested beyond what its job needs.
- Maintained: a commit in the last 12 months.

CI checks the fields. It does not check safety: a maintainer reads the `SKILL.md` or plugin before merging.

## Categories

Pick one from [`categories.json`](categories.json). CI fails on anything else.

**Name the job people do, or the platform they do it on.**

- Good: `Creative strategy`, `Google SEO`, `TikTok, Instagram & YouTube data`, `Email sending`, `Billing, credits & paywalls`.
- Bad: `Ad intelligence`, `Tools`, `AI platforms`, `Marketing solutions`, `Other`.
- Platform-specific beats generic: `Meta ads` over `Social ads`. One platform per name where you can; list several only when the tool really spans them.
- Sentence case, ≤40 characters, and none of: intelligence, tools, platform(s), solutions, misc, other, general, management, utilities.

Need a new one? Add it to `categories.json` (A-Z) in the same PR and say why no existing one fits. CI checks the rule and a maintainer approves the name.

## Description style

- One sentence, ≤160 chars, ends with a period.
- Say what it is and what it does, in plain terms. Name the real interfaces, platforms and limits ("for Chromium, Firefox and WebKit", "TikTok (EU) ad library"). No adjectives about quality, no benefits, no "useful for".
- Every claim must be checkable on the tool's own site or docs.
- CI rejects filler like handy, powerful, seamless, leverage, robust, at scale, one call, all-in-one, solution, easily, simply.
- Don't start with the product name or "A tool that".
- Canonical URL, no UTM or referral params.

## Credit

Add `maker_x` (the maker's X handle, no @). Every Friday new entries ship as a GitHub Release, and makers get credited in its draft X posts.

## Listed? Add the badge

```md
[![Listed on Marketing Engineering](https://marketingengineering.dev/badge.svg)](https://github.com/proxy-intell/marketing-engineering)
```
