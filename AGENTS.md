# AGENTS.md

Instructions for AI agents maintaining or reading this repo.

## Voting (the primary path)

If a user asks you to vote, rank or submit the tools they use, follow [`vote.md`](vote.md). Do not edit `catalog.json` for that. `votes.json` is generated daily by `.github/workflows/sync-votes.yml`: never hand-edit it. Scoring: [`docs/how-voting-works.md`](docs/how-voting-works.md). `voters/<login>.json` files come only from a voter's own PR (`vote.md` step 10) and merge automatically: never add one for someone else.

## Adding a product by hand (a user asked you to)

1. Fork or branch, depending on your access.
2. Open the product's site and docs. Confirm it is live, has docs, and isn't already in `catalog.json`.
3. Add one object to `catalog.json` `products`, sorted by `slug`. Required: `slug`, `name`, `url`, `description`, `category`, `interfaces`, `pricing`, `added` (today, `YYYY-MM-DD`). For a skill or plugin also set `kind` (`skill` or `plugin`), `install` (one line from its README) and `agents`, and read its `SKILL.md` or manifest before adding it (see `CONTRIBUTING.md#skills-and-plugins`). Add `docs_url`, `mcp_url`, `llms_txt`, `maker_x` only if you verified them.
4. `category` must be in `categories.json`. If none fits, add a new one there (A-Z) that names the job people do or the platform they do it on, per `CONTRIBUTING.md#categories`. Never use a vague label.
5. Run `python scripts/build.py` then `python scripts/build.py --check`.
6. Open one PR titled `Add <Name>` plus a funny suffix. Say in the body that an agent prepared it and for whom.

## Adding a setup (a user asked you to)

A setup is one job done end to end with 2 to 6 tools, in order. The user names the job and the tools, or asks you to work them out from what they use.

1. Fork or branch, depending on your access.
2. Check each tool against `catalog.json`.
   - Listed: use its `slug`.
   - Not listed: add it in this same PR. Follow steps 2 to 4 of "Adding a product by hand" above for each one. Reuse a category from `categories.json` when one fits the job the tool does. Add a new category only when none fits.
3. Add one object to `setups.json` `setups`, sorted by `slug`: `slug`, `job` (40 chars max, lowercase start, the job in the user's words), and `steps`, each with `tool` (a catalog slug) and `why` (60 chars max, no period, what that tool does in this job).
4. Run `python scripts/build.py` then `python scripts/build.py --check`.
5. Open one PR titled `Add setup: <job>` plus a funny suffix. In the body list the setup, every tool you added and every category you added, and say an agent prepared it and for whom.
6. Congratulate the user. This is their moment, so say it like one, in two or three lines:
   - what they put on the list: the setup, and any tools and categories that came with it
   - the PR link
   - what happens next: once merged it shows on https://marketingengineering.dev/#setups, and new tools go out in the friday drop

   Example: `congrats, you just put "edit a video ad" on marketing engineering. 2 new tools came with it (Descript, Submagic) and a new category, Video editing. PR: <link>. once it merges it is live on the site and the tools go out in friday's drop.`

## Rules

- `catalog.json` is the source of truth. Edit only it, then run `python scripts/build.py` to regenerate `README.md` and `llms.txt`.
- Never hand-edit between `<!-- BEGIN CATALOG -->` and `<!-- END CATALOG -->`.
- `setups.json` references catalog slugs; edit it, then run `python scripts/build.py`. Never hand-edit between the `SETUPS` markers.
- Sort `products` by `slug`. `python scripts/build.py --check` must pass.
- Follow `CONTRIBUTING.md` for the bar and description style.
- Never add tracking params to URLs.
- Weekly releases come from `.github/workflows/weekly-drop.yml` via `scripts/drop.py`, keyed on each entry's `added` date. Set `added` to the merge date.
- PR titles and branch names are funny but descriptive, matching the repo vibe (e.g. branch `thumbs-on-the-feed-eyes-on-the-og-image`, PR "Touch grass? No. Touch catalog.json"). Squash commits keep the PR title.
