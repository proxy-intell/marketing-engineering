# Install the vote skill

The command in the README works with no install. These make it permanent, so you can say "vote on marketing engineering" any time.

| Agent | How | Tested |
|---|---|---|
| Any (Claude Code, Cursor, Codex, Copilot, 40+ more) | `npx skills add proxy-intell/marketing-engineering` | skill discovery tested against this repo |
| Claude Code | `/plugin install marketing-engineering --marketplace proxy-intell/marketing-engineering` | validated and installed in a clean config |
| Claude Code, manual | `mkdir -p ~/.claude/skills/vote-marketing-engineering && curl -sL https://votes.useproxy.dev/vote.md -o ~/.claude/skills/vote-marketing-engineering/SKILL.md` | yes |
| Cursor | marketplace manifest `.cursor-plugin/marketplace.json` → `plugins/marketing-engineering` | **not tested** |
| Codex | marketplace manifest `.agents/plugins/marketplace.json` → `plugins/codex` | **not tested** |
| GitHub Copilot | marketplace manifest `.github/plugin/marketplace.json` → `plugins/copilot` | **not tested** |
| Skill discovery clients | `https://votes.useproxy.dev/.well-known/skills/index.json` | endpoint tested |

The Cursor, Codex and Copilot manifests follow the layout [treg](https://github.com/superdesigndev/treg) publishes for the same three. If one doesn't install, open an issue with the error.

## How it's built

One source, [`vote.md`](../vote.md). `python scripts/build.py` copies it into every package and CI fails if a copy is stale:

- `skills/vote-marketing-engineering/` for `npx skills add`
- `plugins/marketing-engineering/` for Claude Code and Cursor
- `plugins/codex/` for Codex
- `plugins/copilot/` for Copilot
