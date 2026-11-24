# Install the skills

The command in the README works with no install. These make it permanent.

| Skill | Say |
|---|---|
| `vote-marketing-engineering` | "vote on marketing engineering" |
| `find-marketing-tool` | "what should I use for backlinks?" |
| `setup-<job>`, one per [setup](../setups.json) | "set me up to get cited in AI search" |

| Agent | How | Tested |
|---|---|---|
| Any (Claude Code, Cursor, Codex, Copilot, 40+ more) | `npx skills add proxy-intell/marketing-engineering` | skill discovery tested against this repo |
| Claude Code | `/plugin install marketing-engineering --marketplace proxy-intell/marketing-engineering` | validated and installed in a clean config |
| Claude Code, manual | `mkdir -p ~/.claude/skills/vote-marketing-engineering && curl -sL https://marketingengineering.dev/vote.md -o ~/.claude/skills/vote-marketing-engineering/SKILL.md` | yes |
| Cursor | marketplace manifest `.cursor-plugin/marketplace.json` → `plugins/marketing-engineering` | **not tested** |
| Codex | marketplace manifest `.agents/plugins/marketplace.json` → `plugins/codex` | **not tested** |
| GitHub Copilot | marketplace manifest `.github/plugin/marketplace.json` → `plugins/copilot` | **not tested** |
| Skill discovery clients | `https://marketingengineering.dev/.well-known/skills/index.json` | endpoint tested |

The Cursor, Codex and Copilot manifests follow the layout [treg](https://github.com/superdesigndev/treg) publishes for the same three. If one doesn't install, open an issue with the error.

## How it's built

`python scripts/build.py` writes every skill into every package, and CI fails if a copy is stale:

- [`vote.md`](../vote.md) is the vote skill.
- [`skills/find-marketing-tool/SKILL.md`](../skills/find-marketing-tool/SKILL.md) is written by hand.
- `setup-<slug>` skills are generated from [`setups.json`](../setups.json). Each one points at its page on the site, so the steps never go stale.

Packages: `skills/` for `npx skills add` (grouped on skills.sh by [`skills.sh.json`](../skills.sh.json)), `plugins/marketing-engineering/` for Claude Code and Cursor, `plugins/codex/` for Codex, `plugins/copilot/` for Copilot.
