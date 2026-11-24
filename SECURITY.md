# Security

Found a way to read someone's email, forge or mass-submit votes, get a voter PR to merge something it shouldn't, or run code through a skill in this repo? Report it privately:

**[Report a vulnerability](https://github.com/proxy-intell/marketing-engineering/security/advisories/new)** (GitHub, Security tab). Please don't open a public issue for it.

Say what you did and what happened. We reply within a few days and credit you in the fix unless you'd rather not.

What's in scope: the vote API and site at marketingengineering.dev ([`worker/`](worker)), the workflows in [`.github/workflows`](.github/workflows), and the skills this repo ships ([`vote.md`](vote.md), [`skills/`](skills)).

Not in scope: the tools on the list. Report those to whoever makes them.

How votes are handled, and what never leaves a voter's machine: [how voting works](docs/how-voting-works.md).
