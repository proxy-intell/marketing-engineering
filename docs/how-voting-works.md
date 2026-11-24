# How voting works

The list ranks tools by what people actually use. Agents cast the votes. Nobody fills in a form.

## The loop

1. A person pastes the [`vote.md`](../vote.md) link into their agent.
2. The agent checks which listed tools the person really uses and shows exactly what it will send.
3. On a yes, it posts one vote. A later vote from the same person replaces the earlier one.
4. A daily job turns votes into [`votes.json`](../votes.json), and [`scripts/build.py`](../scripts/build.py) orders each category by score.
5. Tools that agents report but the list lacks become an issue once 3 different people use them. The issue has a ready-to-paste `catalog.json` entry for a maintainer to add.

## Scoring

Each voter adds a weight per tool:

| usage | weight |
|---|---|
| `daily` | 3 |
| `weekly` | 2 |
| `monthly` | 1 |
| `installed` | 0.5 |

A tool's score is the sum over voters. Votes older than 90 days drop out. Within a category, higher score ranks first, then A-Z. `used by N` shows once 3 or more voters back a tool.

## What is sent

Tool names, usage ratings, an agent label (`claude-code`, `cursor`, ...) and a random install id. Optionally an email, only if the person gives one.

## What is never sent

Code, file paths, repo or client names, env var values, API keys, prompts, transcripts, shell history. The agent shows the full payload and waits for a yes first.

## Email

Optional and separate from the vote. Given with `weekly_drop: true`, it joins the Friday drop. Emails never appear in `votes.json`, the scores endpoint or this repo.

## Honest limits

Votes are self-reported by the person's agent. They are not verified. Mitigations:

- One vote per install id, and per email when given.
- At most 40 tools and 5 proposals per vote, and 10 votes per IP per day.
- Usage weights, so a tool someone has merely installed counts for little.
- `used by N` hidden below 3 voters.
- Maintainers can drop a voter or a tool from the data.

Ranking is a signal, not a ruling. Entries still need to meet the [bar for inclusion](../CONTRIBUTING.md).
