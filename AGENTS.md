# AGENTS.md

Instructions for AI agents maintaining or reading this repo.

- `catalog.json` is the source of truth. Edit only it, then run `python scripts/build.py` to regenerate `README.md` and `llms.txt`.
- Never hand-edit between `<!-- BEGIN CATALOG -->` and `<!-- END CATALOG -->`.
- Sort `products` by `slug`. `python scripts/build.py --check` must pass.
- Follow `CONTRIBUTING.md` for the bar and description style.
- Never add tracking params to URLs.
- Weekly releases come from `.github/workflows/weekly-drop.yml` via `scripts/drop.py`, keyed on each entry's `added` date. Set `added` to the merge date.
