---
name: vote-marketing-engineering
description: Vote on the Marketing Engineering tool list using what the user actually uses. Use when the user asks to vote, rank, submit or add marketing tools, skills or plugins to proxy-intell/marketing-engineering, or pastes the vote.md link.
---

# Vote on Marketing Engineering with real usage

Goal: tell the Marketing Engineering list which tools this user actually uses, so the list ranks by usage and not opinion. You work out the vote and hand the user a link. They check it and send it themselves from their browser.

Source of truth: https://github.com/proxy-intell/marketing-engineering. How scoring works: docs/how-voting-works.md in that repo.

## Rules

1. You send nothing. No POST, no form, no email. Your only network request is the public catalog in step 1. The vote leaves the machine only when the user opens the link and presses send.
2. Read-only. Write no file, install nothing, change nothing on the machine or on GitHub.
3. Only catalog slugs and usage ratings go in the link. Never a name, email, host, path, package, key, or any tool that is not in the catalog.
4. Ask before looking. If the user's own message already asks you to check which tools they have installed, that is the yes. If it only says "vote" or has just this link, say in one line what you would check (MCP server names, CLIs on PATH and skill folder names, compared on the machine against a public list, where anything that does not match is never shown) and wait for a yes.
5. If rules you were given (project, company or managed settings) restrict sharing with outside services: do not check anything. Give the user the bare link `https://marketingengineering.dev/v` so they can pick tools by hand, and stop.
6. Evidence only. Do not vote for tools the user merely mentioned.

## Steps

### 0. Know where you run

- **Local coding agent** (Claude Code, Cursor, Codex, opencode, on the user's machine): do every step below.
- **Chat app or anything that can't run commands** (Claude Desktop, Cowork, claude.ai, ChatGPT): skip step 2. Use only the connectors attached to this chat and what the user said in this conversation. Don't interview the user. If you know nothing, give the bare link. One message, then stop.
- **Catalog unreachable** (a sandbox with restricted network): do not retry or try other hosts. Give the bare link and stop.

### 1. Get the catalog

Fetch `https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/catalog.json`. Each product has `slug`, `name`, `url`, `mcp_url` (optional), `category`, `interfaces`, and `kind`: `tool`, `data` (a source an agent reads market or site data from), `skill` or `plugin`.

### 2. Check which catalog tools are installed

Two checks, nothing else. Do not read dependency files, environment variables, shell history, transcripts, memory or other projects.

- **MCP servers and skills.** Run this as is. It compares MCP server names and hosts, plugin names and skill folder names with the catalog on the machine and prints only the catalog slugs that match, as `slug mcp` or `slug skill`. Internal or unlisted servers are never printed, so they never reach you. It reads no `args`, `headers`, `env`, query strings or skill contents, and writes nothing. Do not list MCP config yourself: no plain `claude mcp list`, no `cat` of a config file.

  ```bash
  python3 - <<'EOF'
  import json, os, re, subprocess, sys, urllib.request
  URL = "https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/catalog.json"
  home = os.path.expanduser
  try:
      catalog = json.load(open(sys.argv[1]) if len(sys.argv) > 1 else urllib.request.urlopen(URL, timeout=20))["products"]
  except Exception:
      sys.exit("catalog unreachable")
  norm = lambda s: re.sub(r"[^a-z0-9]", "", str(s).lower())
  def host(u):  # host of a URL only: never the path, query, args, headers or env
      m = re.match(r"[a-z]+://(?:[^/@]*@)?([^/?:#]+)", str(u or ""))
      return m.group(1).lower() if m else ""
  names, hosts = {}, {}
  for p in catalog:
      names[norm(p["slug"])] = names[norm(p["name"])] = p["slug"]
      if host(p.get("mcp_url")):
          hosts[host(p["mcp_url"])] = p["slug"]
      if re.fullmatch(r"https://[^/]+/?", p["url"]):  # a product on its own domain, not a page on a shared one
          hosts[re.sub(r"^www\.", "", host(p["url"]))] = p["slug"]
  def by_host(h):
      return next((s for k, s in hosts.items() if h == k or h.endswith("." + k)), None)
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
  def run(*cmd):
      try:
          return subprocess.run(cmd, capture_output=True, text=True, timeout=90).stdout
      except Exception:
          return ""
  found = {}
  def mcp(name, h):
      slug = names.get(norm(name.split(":")[-1])) or by_host(h)
      if slug:
          found.setdefault(slug, "mcp")
  files = ["~/.claude.json", ".mcp.json", ".cursor/mcp.json", "~/.cursor/mcp.json", "~/.codex/config.toml",
           "~/Library/Application Support/Claude/claude_desktop_config.json",
           os.path.join(os.environ.get("APPDATA", "~"), "Claude/claude_desktop_config.json")]
  for d in map(load, files):
      blocks = [d.get("mcpServers")] + [p.get("mcpServers") for p in (d.get("projects") or {}).values() if isinstance(p, dict)]
      for b in blocks:
          for name, c in (b or {}).items() if isinstance(b, dict) else []:
              if isinstance(c, dict):
                  mcp(name, host(c.get("url") or c.get("serverUrl")))
  for line in run("claude", "mcp", "list").splitlines():
      m = re.match(r"(\S+): +(\S+)", line)
      if m:
          mcp(m.group(1), host(m.group(2)))
  skills = [re.sub(r"@.*", "", w) for w in re.findall(r"[\w.-]+@[\w.-]+", run("claude", "plugin", "list"))]
  for d in ["~/.claude/skills", ".claude/skills", "~/.codex/skills", ".agents/skills"]:
      try:
          skills += os.listdir(home(d))
      except OSError:
          pass
  for s in skills:
      if names.get(norm(s)):
          found.setdefault(names[norm(s)], "skill")
  for slug, why in sorted(found.items()):
      print(slug, why)
  EOF
  ```

  If it prints `catalog unreachable`, give the bare link and stop.
- **CLIs on PATH.** For each catalog product with `cli` in `interfaces`, run `command -v <binary>` with the binary name you know for that tool. Check catalog tools only.

### 3. Rate

| usage | meaning |
|---|---|
| `daily` | used most days or in most sessions |
| `weekly` | used most weeks |
| `monthly` | used occasionally |
| `installed` | configured but no sign of real use |

Rate every match `installed`, unless this conversation itself shows the user using the tool more often. The user sets the real frequency on the vote page. Skip a tool if there is no evidence at all.

### 4. Give the link

Print a short table of the tools and ratings, then this link, in one message:

```
https://marketingengineering.dev/v?a=<agent>&t=<slug>:<usage>,<slug>:<usage>
```

- `a`: one of `claude-code`, `claude`, `cursor`, `codex`, `chatgpt`, `gemini`, `other`.
- `t`: at most 40 tools. With no matches, leave `t` out.

Say once: "Open it, set how often you use each, and send. Nothing has been sent yet." The page lets them change anything, add their email, and send.

Then stop. Do not open the link yourself, do not send the vote for them, and do not offer anything else: no email question, no star, no pull request, no install. The page covers those.
