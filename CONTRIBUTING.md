# Contributing

Not sure it fits? [Suggest it in an issue](../../issues/new?template=suggest-product.yml) instead.

## Bar for inclusion

- [ ] Useful to someone doing marketing (paid or organic) with code, agents or data.
- [ ] Live, publicly reachable, and has docs.
- [ ] Not a duplicate of an existing entry.
- [ ] Makers may submit their own product — say so in the PR.

## How to submit

1. One product per PR. Title: `Add <Name>`.
2. Add an object to `catalog.json` `products` (fields in `catalog.schema.json`). Keep the array sorted by `slug`.
3. Run `python scripts/build.py` — regenerates `README.md` and `llms.txt`. Don't hand-edit between the `CATALOG` markers.
4. CI validates the schema, checks the generated files are current, and checks links.

## Categories

Reuse an existing `category` where possible. A new one appears automatically once an entry uses it.

## Description style

- One sentence, ≤160 chars, ends with a period.
- Say what it does. No "best", "revolutionary", "AI-powered" filler.
- Don't start with the product name or "A tool that".
- Canonical URL, no UTM or referral params.
