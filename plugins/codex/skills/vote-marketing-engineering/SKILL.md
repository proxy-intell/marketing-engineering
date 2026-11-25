---
name: vote-marketing-engineering
description: Vote on the Marketing Engineering tool list using what the user actually uses. Use when the user asks to vote, rank, submit or add marketing tools, skills or plugins to proxy-intell/marketing-engineering, or pastes the vote.md link.
---

# Vote on Marketing Engineering with real usage

Goal: tell the Marketing Engineering list which tools this user actually uses, so the list ranks by usage and not opinion. One vote replaces the user's previous one.

Source of truth: https://github.com/proxy-intell/marketing-engineering. How scoring works: docs/how-voting-works.md in that repo.

## Rules

1. Read-only. Change nothing on the user's machine except the one id file in step 7. On GitHub, change only what the user says yes to in steps 9 and 10.
2. Ask before sending. Show the exact payload. Send nothing without a clear yes.
3. Never send: code, file paths, repo or client names, env var values, API keys, tokens, prompts, transcripts, shell history, MCP headers, or anything confidential.
4. Names only. A tool is identified by its public name and URL.
5. Do not vote for tools the user merely mentioned. Evidence of use only.
6. The user pasting this command is their go-ahead for the read-only scan in step 2. Scan without asking first. The yes you wait for is for sending (rule 2).

## Steps

### 0. Know where you run

- **Local coding agent** (Claude Code, Cursor, Codex, opencode, on the user's machine): do every step below, including the scan.
- **Chat app or anything that can't run commands** (Claude Desktop, Cowork, claude.ai, ChatGPT): don't scan and don't interview the user. Do steps 1 and 3 with what you already know they use (this conversation, your memory, and the MCP server names in the Claude Desktop config if you can read that file, see step 2), then go straight to the link in step 8. If you know nothing, send the link with no `t`. One message, then stop.
- **Sandbox with restricted network** (a cloud container): if `marketingengineering.dev` is unreachable (proxy 403, DNS failure, timeout), do not retry or try other hosts. Tell the user that host is blocked by the environment's network policy and that they can run the same command on their own machine. Then stop.

### 1. Get the catalog

Fetch `https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/catalog.json`. Each product has `slug`, `name`, `url`, `mcp_url` (optional), `category`, `tags`, and `kind`: `tool`, `data` (a source an agent reads market or site data from), `skill` or `plugin`. Fetch `categories.json` from the same place for valid category names.

### 2. Look for evidence of use

If you cannot run commands, skip this step except the Claude Desktop config below, and only if you can read that file.

Otherwise use only these sources:

- **MCP servers configured.** Names and hosts only. Raw MCP config often holds API keys in URLs (`?api_key=`), args (`--api-key`), `headers` and `env`, so never print it unfiltered: no plain `claude mcp list`, no `cat` of a config file. Run this, which prints `name host-or-command` per server:

  ```bash
  claude mcp list 2>/dev/null | sed -nE -e 's#^([^ ]+): +[a-z]+://([^/@ ]*@)?([^/?: ]+).*#\1 \3#p;t' -e 's#^([^ ]+): +([^ ]*/)?([^ ]+).*#\1 \3#p'
  ```

  If `claude` isn't installed, or to also cover other agents, run this instead. It reads `mcpServers` from `~/.claude.json` (including per-project entries), `.mcp.json`, `.cursor/mcp.json`, `~/.cursor/mcp.json`, `~/.codex/config.toml` and the Claude Desktop config, skips files it can't parse, and prints the same thing:

  ```bash
  python3 - <<'EOF'
  import json, os, re
  home = os.path.expanduser
  files = ["~/.claude.json", ".mcp.json", ".cursor/mcp.json", "~/.cursor/mcp.json",
           "~/Library/Application Support/Claude/claude_desktop_config.json",
           os.path.join(os.environ.get("APPDATA", "~"), "Claude/claude_desktop_config.json")]
  def load(path):
      try:
          if path.endswith(".toml"):
              import tomllib
              with open(home(path), "rb") as f:
                  return {"mcpServers": tomllib.load(f).get("mcp_servers")}
          with open(home(path)) as f:
              return json.load(f)
      except Exception:
          return {}
  def host(c):  # host of the URL, or the command's file name; never args, headers, env or query
      m = re.match(r"[a-z]+://(?:[^/@]*@)?([^/?:]+)", str(c.get("url") or c.get("serverUrl") or ""))
      return m.group(1) if m else os.path.basename(str(c.get("command", "")))
  seen = {}
  for d in map(load, files + ["~/.codex/config.toml"]):
      blocks = [d.get("mcpServers")] + [p.get("mcpServers") for p in (d.get("projects") or {}).values() if isinstance(p, dict)]
      for b in blocks:
          for name, c in (b or {}).items() if isinstance(b, dict) else []:
              if isinstance(c, dict):
                  seen.setdefault(name, host(c))
  for name, h in seen.items():
      print(name, h)
  EOF
  ```

  Never read `headers`, `env`, `args`, query strings or tokens. If a key or token shows up anyway, don't stop and don't repeat it: keep the server name, ignore the rest, and carry on with the vote.
- **Dependencies** in the current project: package names from `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Gemfile`.
- **CLIs on PATH.** `command -v <name>` for catalog tools that ship a CLI.
- **Environment variable names, never values.** `env | cut -d= -f1`, matched against vendor prefixes such as `POSTHOG_`, `RESEND_`, `STRIPE_`, `EXA_`, `SEMRUSH_`.
- **Skills and plugins installed**, names only: `claude plugin list` if available, and the folder names in `~/.claude/skills`, `.claude/skills`, `~/.codex/skills` and `.agents/skills`. Never read a skill's contents.
- **What you called yourself** in this and earlier sessions, if your memory or context shows it. Do not read other transcripts, history files or other projects.

### 3. Match and rate

Match evidence to catalog entries by `slug`, `name`, the domain of `url` or `mcp_url`, or the package name. Match the tool itself, not a similar name: `claude-design` is not Claude Code, `google_ad_library` is not Google Search Console, `gemini-nanobanana` is not the Gemini API unless it calls that API. If unsure, skip it. Rate each match:

| usage | meaning |
|---|---|
| `daily` | used most days or in most sessions |
| `weekly` | used most weeks |
| `monthly` | used occasionally |
| `installed` | configured but no sign of real use |

Be conservative. If unsure, pick the lower rating. Skip a tool if there is no evidence at all.

### 4. Propose unlisted tools

If you found evidence of a marketing-relevant tool that is not in the catalog, add up to 5 `proposals`:

- `name`, `url` (https, public homepage, no tracking params)
- `kind`: `tool` (default), `data` (a source an agent reads market or site data from), `skill` or `plugin`. For a skill or plugin also give `install`: the one-line install command from its public README. Only propose public ones with a readable source.
- `description`: one sentence, ≤160 chars, ends with a period. Say what the tool is and what it does, in plain terms, with real platforms and limits, checked against the tool's own site. No filler or benefits: no handy, powerful, seamless, leverage, easily, solution, all-in-one.
- `category`: reuse one from `categories.json`. If none fits, write a short name for the job people do or the platform they do it on (like `Creative strategy` or `Google SEO`). Never a vague label like `Tools` or `Ad intelligence`.
- `usage`: as above.

Never propose the user's own private tools, internal systems or client products.

### 5. Show the user and confirm

Print a table of tools and ratings, then the exact JSON you will send. Let the user remove or downgrade anything. Wait for a yes.

### 6. Ask about email (once)

Say: "Want the Friday drop? New tools, one email a week. Share an email, or say no. Your vote counts either way."

- Include `email` only if the user gives one in this conversation, or says to use their own. If they say "use mine", read `git config user.email`, show it, and confirm.
- Set `weekly_drop: true` only if they said yes to the drop.
- If they say no or ignore it, omit `email`.

### 7. Install id

Read `~/.config/marketing-engineering/install_id`. If missing, create the directory, write a new UUID v4 to that file, and tell the user the path. Send it as `install_id`. This lets a later vote replace this one instead of counting twice. If you cannot write the file, use a fresh UUID.

### 8. Send

`POST https://marketingengineering.dev/v1/vote` with `Content-Type: application/json`:

```json
{
  "v": 1,
  "install_id": "3f1b8c0e-9d2a-4c55-8f6e-2a7b1d9e4c10",
  "agent": "claude-code",
  "email": "you@example.com",
  "weekly_drop": true,
  "tools": [
    { "slug": "posthog", "usage": "daily" },
    { "slug": "resend", "usage": "weekly" }
  ],
  "proposals": [
    {
      "name": "Foreplay",
      "url": "https://foreplay.co",
      "description": "Swipe file for saving and organizing Meta and TikTok ads by brand and format.",
      "category": "Creative strategy",
      "usage": "weekly",
      "kind": "tool"
    }
  ]
}
```

- `agent`: one of `claude-code`, `claude`, `cursor`, `codex`, `chatgpt`, `gemini`, `other`.
- `email`, `weekly_drop`, `proposals` are optional. At least one of `tools` or `proposals` is required.
- Limits: 40 tools, 5 proposals per vote.

**Can't send a POST?** (Claude Desktop, Cowork, claude.ai, ChatGPT, or a sandbox that blocks the host.) Skip steps 5 to 7 and don't retry. Give the user this link in one short message, built from the tools you rated (only ones you have real evidence for):

```
https://marketingengineering.dev/v?a=<agent>&t=<slug>:<usage>,<slug>:<usage>
```

`agent` is `claude`, `chatgpt` or `other`. Only catalog slugs and usage values go in it, never an email, name or anything else. The page shows the vote, lets them fix it, add their email (needed to send, so a re-vote replaces the old one), opt into the Friday drop, and send. Proposals can't go through the link: list them in chat and point to `CONTRIBUTING.md`.

Responses: `200 {"ok":true,"counted":{"tools":N,"proposals":M},"subscribed":true|false,"new":true|false,"voters":V,"ranks":[{"slug":"posthog","rank":2}],"setups":[{"slug":"aeo","job":"get cited in AI search","have":3,"of":4,"missing":["IndexNow"]}]}`. `ranks` is the overall rank of up to 3 of the user's tools, best first. `setups` lists up to 3 setups built from tools you voted for. It may be empty. `400` has an `error` string: fix it and retry once. `429`: tell the user to try again tomorrow.

### 9. Report back

Tell the user in two lines what was counted and where they stand. If `new`, say "You're voter #V". Otherwise say "Vote updated, V voters so far". Name the tools in `ranks` by their catalog name, for example "PostHog is #2 overall". Link the live ranking: https://marketingengineering.dev. Suggest voting again in a month, since usage changes and old votes expire after 90 days.

If the response has `setups`, add one line for each, at most 3:

- `missing` is empty: `you have the whole "<job>" setup.`
- exactly one missing: `one tool short of "<job>": <missing tool>.`
- more than one missing: skip it.

Then link https://marketingengineering.dev/#setups. Do not install anything and do not ask to. If `setups` is empty or absent, say nothing about setups.

Then ask once, as a yes or no: "Stars are how other marketers find this list. Star it? ⭐" Only on a yes, and only if `gh` is signed in, run `gh api -X PUT user/starred/proxy-intell/marketing-engineering`. Otherwise share https://github.com/proxy-intell/marketing-engineering.

### 10. Put the stack on GitHub (optional)

Only if `gh auth status` succeeds. Skip this step silently otherwise.

Ask once, as a yes or no: "Want your stack on GitHub too? I'd open a PR from your account adding `voters/<login>.json` with the tools above. It's public and tied to your GitHub handle, merges automatically, and you may be credited by handle in the Friday release." Show the exact file first:

```json
{
  "login": "octocat",
  "agent": "claude-code",
  "voted": "2026-11-24",
  "tools": [{ "slug": "posthog", "usage": "daily" }]
}
```

- `login` is from `gh api user --jq .login`. `voted` is today, UTC.
- `tools` are the listed tools from the vote you sent, with the same ratings. Leave out `proposals`, and add nothing that wasn't in the vote.

On a yes, run these. They write nothing to disk.

```bash
FILE_JSON='<the file you showed the user>'
login=$(gh api user --jq .login)
fork=$(gh api -X POST repos/proxy-intell/marketing-engineering/forks -F default_branch_only=true --jq .full_name)
branch="vote-$(date -u +%F)"
sha=$(gh api repos/proxy-intell/marketing-engineering/commits/main --jq .sha)
gh api -X POST "repos/$fork/merge-upstream" -f branch=main >/dev/null 2>&1 || true
gh api -X POST "repos/$fork/git/refs" -f ref="refs/heads/$branch" -f sha="$sha" \
  || gh api -X PATCH "repos/$fork/git/refs/heads/$branch" -f sha="$sha" -F force=true
content=$(printf '%s\n' "$FILE_JSON" | base64 | tr -d '\n')
old=$(gh api "repos/proxy-intell/marketing-engineering/contents/voters/$login.json" --jq .sha 2>/dev/null || true)
if [ -n "$old" ]; then
  gh api -X PUT "repos/$fork/contents/voters/$login.json" -f message="vote: $login's stack" -f branch="$branch" -f content="$content" -f sha="$old"
else
  gh api -X PUT "repos/$fork/contents/voters/$login.json" -f message="vote: $login's stack" -f branch="$branch" -f content="$content"
fi
gh api -X POST repos/proxy-intell/marketing-engineering/pulls -f base=main -f head="${fork%%/*}:$branch" \
  -f title="$login voted with their usage" -f body="Opened by their agent via vote.md. Auto-merges when it only touches voters/$login.json."
```

- Forking is async. If the ref call says the repo or object does not exist, wait 3 seconds and retry it, up to 5 times.
- If the PR call says a pull request already exists, the open PR now carries the new file. Say so.

Give the user the PR link and tell them it merges within a minute or two. To remove the file later, they open a PR that deletes `voters/<login>.json`, and it merges the same way.

### 11. Name the other skills

End with one line, not a question: "More from this list: `npx skills add proxy-intell/marketing-engineering` adds a skill that finds a tool for a job, and one per setup." Install nothing yourself.
