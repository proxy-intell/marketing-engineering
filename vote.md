---
name: vote-marketing-engineering
description: Vote on the Marketing Engineering tool list using what the user actually uses. Use when the user asks to vote, rank, submit or add marketing tools to proxy-intell/marketing-engineering, or pastes the vote.md link.
---

# Vote on Marketing Engineering with real usage

Goal: tell the Marketing Engineering list which tools this user actually uses, so the list ranks by usage and not opinion. One vote replaces the user's previous one.

Source of truth: https://github.com/proxy-intell/marketing-engineering. How scoring works: docs/how-voting-works.md in that repo.

## Rules

1. Read-only. Change nothing on the user's machine except the one id file in step 7.
2. Ask before sending. Show the exact payload. Send nothing without a clear yes.
3. Never send: code, file paths, repo or client names, env var values, API keys, tokens, prompts, transcripts, shell history, MCP headers, or anything confidential.
4. Names only. A tool is identified by its public name and URL.
5. Do not vote for tools the user merely mentioned. Evidence of use only.

## Steps

### 1. Get the catalog

Fetch `https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/catalog.json`. Each product has `slug`, `name`, `url`, `mcp_url` (optional), `category`, `tags`. Fetch `categories.json` from the same place for valid category names.

### 2. Look for evidence of use

Use only these sources:

- **MCP servers configured.** Run `claude mcp list` if available. Otherwise read server names and URLs only from `~/.claude.json`, `.mcp.json`, `.cursor/mcp.json`, `~/.cursor/mcp.json`, `~/.codex/config.toml`. Never read `headers`, `env` or tokens.
- **Dependencies** in the current project: package names from `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Gemfile`.
- **CLIs on PATH.** `command -v <name>` for catalog tools that ship a CLI.
- **Environment variable names, never values.** `env | cut -d= -f1`, matched against vendor prefixes such as `POSTHOG_`, `RESEND_`, `STRIPE_`, `EXA_`, `SEMRUSH_`.
- **What you called yourself** in this and earlier sessions, if your memory or context shows it. Do not read other transcripts, history files or other projects.

### 3. Match and rate

Match evidence to catalog entries by `slug`, `name`, the domain of `url` or `mcp_url`, or the package name. Rate each match:

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

If the URL below still contains `{{`, voting is not live yet. Tell the user it opens soon, send nothing, and stop.

`POST {{VOTE_URL}}/v1/vote` with `Content-Type: application/json`:

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
      "usage": "weekly"
    }
  ]
}
```

- `agent`: one of `claude-code`, `cursor`, `codex`, `chatgpt`, `gemini`, `other`.
- `email`, `weekly_drop`, `proposals` are optional. At least one of `tools` or `proposals` is required.
- Limits: 40 tools, 5 proposals per vote.

Responses: `200 {"ok":true,"counted":{"tools":N,"proposals":M},"subscribed":true|false}`. `400` has an `error` string: fix it and retry once. `429`: tell the user to try again tomorrow.

### 9. Report back

Tell the user in two lines: what was counted, and that the list updates daily at https://github.com/proxy-intell/marketing-engineering. Suggest voting again in a month, since usage changes and old votes expire after 90 days.
