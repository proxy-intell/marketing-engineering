"""Check a voter PR: it may only add, edit or remove voters/<author>.json, listing catalog tools.

Usage: python scripts/check_voter.py <author> <pr_files.json> [voter.json]
pr_files.json is the GitHub "list pull request files" response. voter.json is the file at the PR head.
Prints the reason and exits 1 if the PR should not auto-merge. PR content is read as data, never run.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
USAGE = {"daily", "weekly", "monthly", "installed"}
AGENTS = {"claude-code", "cursor", "codex", "chatgpt", "gemini", "other"}
MAX_TOOLS = 40


def check(author, files, text, slugs):
    path = f"voters/{author}.json"
    if len(files) != 1 or files[0]["filename"] != path or files[0]["status"] not in ("added", "modified", "removed"):
        return f"A voter PR changes exactly one file, `{path}` (your own GitHub login), and nothing else."
    if files[0]["status"] == "removed":
        return None
    if not text or len(text) > 5000:
        return f"`{path}` is empty or over 5 KB."
    try:
        v = json.loads(text)
    except json.JSONDecodeError:
        return f"`{path}` is not valid JSON."
    if not isinstance(v, dict) or set(v) != {"login", "agent", "voted", "tools"}:
        return "The file has exactly these keys: `login`, `agent`, `voted`, `tools`."
    if v["login"] != author:
        return f"`login` must be `{author}`, the account that opened this PR."
    if v["agent"] not in AGENTS:
        return f"`agent` must be one of {', '.join(sorted(AGENTS))}."
    if not isinstance(v["voted"], str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v["voted"]):
        return "`voted` must be a date, YYYY-MM-DD."
    tools = v["tools"]
    if not isinstance(tools, list) or not 1 <= len(tools) <= MAX_TOOLS:
        return f"`tools` must list 1 to {MAX_TOOLS} tools."
    seen = set()
    for t in tools:
        if not isinstance(t, dict) or set(t) != {"slug", "usage"}:
            return 'Each tool is `{"slug": ..., "usage": ...}`.'
        if t["slug"] not in slugs:
            return f"`{t['slug']}` is not in catalog.json. Unlisted tools go in the vote's `proposals`, not this file."
        if t["usage"] not in USAGE:
            return f"`usage` must be one of {', '.join(sorted(USAGE))}."
        if t["slug"] in seen:
            return f"`{t['slug']}` is listed twice."
        seen.add(t["slug"])
    return None


if __name__ == "__main__":
    author, files_path = sys.argv[1], sys.argv[2]
    voter = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    text = voter.read_text() if voter and voter.exists() else None
    slugs = {p["slug"] for p in json.loads((ROOT / "catalog.json").read_text())["products"]}
    if error := check(author, json.loads(Path(files_path).read_text()), text, slugs):
        print(error)
        sys.exit(1)
