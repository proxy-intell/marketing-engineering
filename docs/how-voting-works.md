# How voting works

The list ranks tools by what people actually use. Agents work out the vote. The person sends it.

## The loop

1. A person pastes the vote command into their agent. The command itself says what to check: MCP, CLI and skill names.
2. The agent follows [`vote.md`](../vote.md): it compares those names with the catalog on the machine and sees only the ones that match. It sends nothing.
3. It hands over a link to https://marketingengineering.dev/v with the matches filled in. The person sets how often they use each and sends. A later vote from the same person replaces the earlier one.
4. A daily job turns votes into [`votes.json`](../votes.json), and [`scripts/build.py`](../scripts/build.py) orders each category by score.
5. Tools the list lacks come in by pull request ([`CONTRIBUTING.md`](../CONTRIBUTING.md)). Agents no longer report unlisted tools, so nothing outside the catalog leaves the machine.

## Install as a Claude Code skill

Optional. Then say "vote on marketing engineering" (the skill tells you in one line what it will check and waits for a yes):

```
mkdir -p ~/.claude/skills/vote-marketing-engineering && curl -sL https://marketingengineering.dev/vote.md -o ~/.claude/skills/vote-marketing-engineering/SKILL.md
```

## On GitHub (optional)

The agent offers neither of these. The vote page links both after you send:

- **Star the repo.** People who follow you on GitHub can see it.
- **A voter PR from your account**, opened by your agent only when you ask it to ([`voters/README.md`](../voters/README.md)), adding `voters/<login>.json`: the listed tools from your vote, with their ratings. [`voter-pr.yml`](../.github/workflows/voter-pr.yml) merges it once it touches only your own file and lists catalog tools. It never runs the PR's code. The file is public and tied to your handle, and the Friday release may credit you by handle. To remove it, open a PR that deletes the file. Scores still come from the votes; the file is a public receipt.

## Where to see the ranking

- **https://marketingengineering.dev**: the live ranking: one table of every tool, sorted by score, with search, a category filter and voter counts. Also takes Friday-drop sign-ups.
- **README order**: updated daily from the same scores. "used by N" shows at 3 or more voters.
- **`/v1/scores`**: the same data as JSON.
- **https://marketingengineering.dev/v**: where every vote is sent. Your agent links here with your tools filled in. You fix anything, add your email so it replaces any earlier vote, and send. With no link it is a plain form: pick tools by hand.

## Skills and plugins

Voting covers them too. The agent's check reads installed skill and plugin names only, never their contents, and reports just the ones that are on the list.

## Scoring

Each voter adds a weight per tool:

| usage | weight |
|---|---|
| `daily` | 3 |
| `weekly` | 2 |
| `monthly` | 1 |
| `installed` | 0.5 |

A tool's score is the sum over voters. Votes older than 90 days drop out. Within a category, higher score ranks first, then A-Z. `used by N` shows once 3 or more voters back a tool.

## Setups

A setup is one job done with several listed tools. A voter has a setup when their vote lists every tool in it, at any rating. Setups rank by voters who have the whole thing. In the README, `run by N` shows at 3 or more voters; the site shows the count at any number. The vote page tells the voter which setups they have after they send. No extra data is sent.

## What is sent

By the person's browser, when they press send: catalog slugs, usage ratings, an agent label (`claude-code`, `cursor`, ...), a random id kept in that browser, and the email they typed. The agent sends nothing.

## What is never sent

Code, file paths, repo or client names, dependencies, env var names or values, API keys, prompts, transcripts, shell history, or the name of any tool that is not on the list. The agent does not read dependency files, environment variables, memory or past sessions at all.

## Email

Needed on the vote page, so a re-vote from another browser replaces the old one. It joins the Friday drop only if the box is ticked. Emails never appear in `votes.json`, the scores endpoint or this repo.

## Honest limits

Votes are self-reported: the agent finds what is installed, the person says how often they use it. They are not verified. Mitigations:

- One vote per browser id, and per email.
- At most 40 tools per vote, and 10 votes per IP per day.
- Usage weights, so a tool someone has merely installed counts for little.
- `used by N` hidden below 3 voters.
- Maintainers can drop a voter or a tool from the data.

Ranking is a signal, not a ruling. Entries still need to meet the [bar for inclusion](../CONTRIBUTING.md).
