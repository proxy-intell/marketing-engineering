"""Generate README.md and llms.txt from catalog.json + categories.json + votes.json.
Within a category, tools rank by vote score (votes.json), then A-Z. "used by N" shows at 3+ voters.

Usage: python scripts/build.py          # write
       python scripts/build.py --check  # exit 1 if files are stale or catalog is unsorted
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BEGIN, END = "<!-- BEGIN CATALOG -->", "<!-- END CATALOG -->"
SETUPS_BEGIN, SETUPS_END = "<!-- BEGIN SETUPS -->", "<!-- END SETUPS -->"
# Category names the job someone does or the platform they do it on. These words mark a vague label.
# Description filler. A description says what the tool is and does, in plain terms.
FILLER = re.compile(r"\b(handy|useful for|powerful|seamless\w*|leverag\w+|robust|cutting-edge|state-of-the-art|world-class|best-in-class|next-gen\w*|game-changing|revolutionary|ai-powered|all-in-one|supercharg\w+|unlock\w*|streamlin\w+|empower\w*|effortless\w*|easily|simply|at scale|in one tool|with one call|one call|solutions?|ecosystem)\b", re.I)
VAGUE = {"intelligence", "tools", "tooling", "platform", "platforms", "solutions", "misc", "miscellaneous", "other", "general", "stuff", "management", "utilities"}


def anchor(text):
    return re.sub(r"[^a-z0-9 -]", "", text.lower()).replace(" ", "-")


MIN_VOTERS = 3
AGENT_NAMES = {"claude-code": "Claude Code", "cursor": "Cursor", "codex": "Codex", "copilot": "Copilot", "gemini": "Gemini CLI", "any": "any agent"}
# Every package ships the same skill text as vote.md: Claude Code + Cursor, Codex, Copilot, and the bare skill for `npx skills add`.
SKILL_COPIES = [ROOT / d / "vote-marketing-engineering/SKILL.md" for d in ("plugins/marketing-engineering/skills", "plugins/codex/skills", "plugins/copilot/skills", "skills")]


def kind_tag(p):
    if p.get("kind", "tool") == "tool":
        return ""
    if p["kind"] == "data":
        return " · data"
    return f" · {p['kind']} for {', '.join(AGENT_NAMES[a] for a in p['agents'])} · `{p['install']}`"


def by_category(products, votes):
    groups = {}
    for p in sorted(products, key=lambda p: (-votes.get(p["slug"], {}).get("score", 0), p["name"].lower())):
        groups.setdefault(p["category"], []).append(p)
    return dict(sorted(groups.items(), key=lambda kv: kv[0].lower()))


def used_by(p, votes):
    n = votes.get(p["slug"], {}).get("voters", 0)
    return n if n >= MIN_VOTERS else 0


def readme_block(groups, votes):
    if not groups:
        return "_No entries yet._"
    toc = "\n".join(f"- [{c}](#{anchor(c)})" for c in groups)
    sections = "\n\n".join(
        f"## {c}\n\n" + "\n".join(f"- [{p['name']}]({p['url']}) - {p['description']}" + kind_tag(p) + (f" · used by {used_by(p, votes)}" if used_by(p, votes) else "") for p in ps)
        for c, ps in groups.items()
    )
    return f"## Contents\n\n{toc}\n\n{sections}"


def llms_block(groups, votes):
    if not groups:
        return "_No entries yet._"
    return "\n\n".join(
        f"### {c}\n\n" + "\n".join(
            f"- [{p['name']}]({p['url']}): {p['description']} Interfaces: {', '.join(p['interfaces'])}. Pricing: {p['pricing']}."
            + (f" MCP: {p['mcp_url']}." if p.get("mcp_url") else "")
            + (f" Kind: {p['kind']}. Agents: {', '.join(p['agents'])}. Install: `{p['install']}`." if p.get("kind") in ("skill", "plugin") else "")
            + (" Kind: data." if p.get("kind") == "data" else "")
            + (f" Used by {used_by(p, votes)} agents." if used_by(p, votes) else "")
            for p in ps
        )
        for c, ps in groups.items()
    )


def setup_errors(setups, products):
    errors = []
    slugs = [s["slug"] for s in setups]
    if slugs != sorted(slugs):
        errors.append("setups.json setups must be sorted by slug")
    if len(slugs) != len(set(slugs)):
        errors.append("setups.json has duplicate slugs")
    known = {p["slug"] for p in products}
    for s in setups:
        sl = s["slug"]
        if not re.fullmatch(r"[a-z0-9-]{1,40}", sl):
            errors.append(f"setup {sl}: slug must match [a-z0-9-]{{1,40}}")
        if not 1 <= len(s["job"]) <= 40 or not s["job"][0].islower():
            errors.append(f"setup {sl}: job must be 1 to 40 chars and start lowercase")
        tools = [t["tool"] for t in s["steps"]]
        if not 2 <= len(tools) <= 6:
            errors.append(f"setup {sl}: needs 2 to 6 steps")
        if len(tools) != len(set(tools)):
            errors.append(f"setup {sl}: repeats a tool")
        for t in s["steps"]:
            if t["tool"] not in known:
                errors.append(f"setup {sl}: tool '{t['tool']}' is not in catalog.json")
            why = t["why"]
            if not 1 <= len(why) <= 60 or why.endswith("."):
                errors.append(f"setup {sl}: why '{why}' must be 1 to 60 chars (max 60) with no trailing period")
            if m := FILLER.search(why):
                errors.append(f"setup {sl}: why has filler ('{m.group(0)}')")
    return errors


def setups_block(setups, products, setup_votes):
    by_slug = {p["slug"]: p for p in products}
    voters = lambda s: setup_votes.get(s["slug"], {}).get("voters", 0)
    out = []
    for s in sorted(setups, key=lambda s: (-voters(s), s["job"])):
        steps = "\n".join(f"{i}. [{by_slug[t['tool']]['name']}]({by_slug[t['tool']]['url']}): {t['why']}" for i, t in enumerate(s["steps"], 1))
        run = f" · run by {voters(s)}" if voters(s) >= MIN_VOTERS else ""
        out.append(f"### {s['job']}\n\n{steps}\n\npaste into your agent: `set up \"{s['job']}\" - https://marketingengineering.dev/setups/{s['slug']}.md`{run}")
    return "\n\n".join(out)


def splice(path, block, begin=BEGIN, end=END, text=None):
    text = text or path.read_text()
    start, end = text.index(begin) + len(begin), text.index(end)
    return text[:start] + f"\n\n{block}\n\n" + text[end:]


def main():
    check = "--check" in sys.argv
    products = json.loads((ROOT / "catalog.json").read_text())["products"]
    slugs = [p["slug"] for p in products]
    errors = []
    if slugs != sorted(slugs):
        errors.append("catalog.json products must be sorted by slug")
    if len(slugs) != len(set(slugs)):
        errors.append("catalog.json has duplicate slugs")

    categories = json.loads((ROOT / "categories.json").read_text())
    if categories != sorted(categories, key=str.lower):
        errors.append("categories.json must be sorted A-Z")
    for c in categories:
        if VAGUE & set(re.findall(r"[a-z]+", c.lower())) or len(c) > 40:
            errors.append(f"Category '{c}': name the job people do or the platform they do it on (e.g. 'Creative strategy', 'Google SEO'), not a vague label. See CONTRIBUTING.md#categories")
    for p in products:
        d = p["description"]
        if m := FILLER.search(d):
            errors.append(f"{p['slug']}: description has filler ('{m.group(0)}'). Say what it is and what it does, plainly. See CONTRIBUTING.md#description-style")
        if not d.endswith(".") or d.lower().startswith(p["name"].lower()):
            errors.append(f"{p['slug']}: description must end with a period and not start with the product name")
        if p["category"] not in categories:
            errors.append(f"{p['slug']}: category '{p['category']}' is not in categories.json. Reuse one, or add yours there following CONTRIBUTING.md#categories")

    setups = json.loads((ROOT / "setups.json").read_text())["setups"]
    errors += setup_errors(setups, products)
    votes_file = json.loads((ROOT / "votes.json").read_text()) if (ROOT / "votes.json").exists() else {}
    votes, setup_votes = votes_file.get("tools", {}), votes_file.get("setups", {})
    groups = by_category(products, votes)
    skill = (ROOT / "vote.md").read_text()
    for copy in SKILL_COPIES:
        if not copy.exists() or copy.read_text() != skill:
            if check:
                errors.append(f"{copy.relative_to(ROOT)} is stale: run python scripts/build.py")
            else:
                copy.parent.mkdir(parents=True, exist_ok=True)
                copy.write_text(skill)
    for name, block in (("README.md", readme_block(groups, votes)), ("llms.txt", llms_block(groups, votes))):
        path = ROOT / name
        new = splice(path, setups_block(setups, products, setup_votes), SETUPS_BEGIN, SETUPS_END, splice(path, block))
        if new == path.read_text():
            continue
        if check:
            errors.append(f"{name} is stale: run python scripts/build.py")
        else:
            path.write_text(new)

    if errors:
        sys.exit("\n".join(errors))


if __name__ == "__main__":
    main()
