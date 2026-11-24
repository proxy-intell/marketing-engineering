# AGENTS.md

Instructions for AI agents maintaining or reading this repo.

## Voting (the primary path)

If a user asks you to vote, rank or submit the tools they use, follow [`vote.md`](vote.md). Do not edit `catalog.json` for that. `votes.json` is generated daily by `.github/workflows/sync-votes.yml`: never hand-edit it. Scoring: [`docs/how-voting-works.md`](docs/how-voting-works.md).

## Adding a product by hand (a user asked you to)

1. Fork or branch, depending on your access.
2. Open the product's site and docs. Confirm it is live, has docs, and isn't already in `catalog.json`.
3. Add one object to `catalog.json` `products`, sorted by `slug`. Required: `slug`, `name`, `url`, `description`, `category`, `interfaces`, `pricing`, `added` (today, `YYYY-MM-DD`). Add `docs_url`, `mcp_url`, `llms_txt`, `maker_x` only if you verified them.
4. `category` must be in `categories.json`. If none fits, add a new one there (A-Z) that names the job people do or the platform they do it on, per `CONTRIBUTING.md#categories`. Never use a vague label.
5. Run `python scripts/build.py` (also regenerates the issue form), then `python scripts/build.py --check`.
6. Open one PR titled `Add <Name>` plus a funny suffix. Say in the body that an agent prepared it and for whom.

## Rules

- `catalog.json` is the source of truth. Edit only it, then run `python scripts/build.py` to regenerate `README.md` and `llms.txt`.
- Never hand-edit between `<!-- BEGIN CATALOG -->` and `<!-- END CATALOG -->`.
- Sort `products` by `slug`. `python scripts/build.py --check` must pass.
- Follow `CONTRIBUTING.md` for the bar and description style.
- Never add tracking params to URLs.
- Weekly releases come from `.github/workflows/weekly-drop.yml` via `scripts/drop.py`, keyed on each entry's `added` date. Set `added` to the merge date.
- PR titles and branch names are funny but descriptive, matching the repo vibe (e.g. branch `thumbs-on-the-feed-eyes-on-the-og-image`, PR "Touch grass? No. Touch catalog.json"). Squash commits keep the PR title.
