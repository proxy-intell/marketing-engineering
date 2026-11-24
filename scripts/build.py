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
# Category names the job someone does or the platform they do it on. These words mark a vague label.
# Description filler. A description says what the tool is and does, in plain terms.
FILLER = re.compile(r"\b(handy|useful for|powerful|seamless\w*|leverag\w+|robust|cutting-edge|state-of-the-art|world-class|best-in-class|next-gen\w*|game-changing|revolutionary|ai-powered|all-in-one|supercharg\w+|unlock\w*|streamlin\w+|empower\w*|effortless\w*|easily|simply|at scale|in one tool|with one call|one call|solutions?|ecosystem)\b", re.I)
VAGUE = {"intelligence", "tools", "tooling", "platform", "platforms", "solutions", "misc", "miscellaneous", "other", "general", "stuff", "management", "utilities"}


def anchor(text):
    return re.sub(r"[^a-z0-9 -]", "", text.lower()).replace(" ", "-")


MIN_VOTERS = 3
AGENT_NAMES = {"claude-code": "Claude Code", "cursor": "Cursor", "codex": "Codex", "copilot": "Copilot", "gemini": "Gemini CLI", "any": "any agent"}
SKILL_COPY = ROOT / "plugins/marketing-engineering/skills/vote-marketing-engineering/SKILL.md"  # same text as vote.md


def kind_tag(p):
    if p.get("kind", "tool") == "tool":
        return ""
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
            + (f" Kind: {p['kind']}. Agents: {', '.join(p['agents'])}. Install: `{p['install']}`." if p.get("kind", "tool") != "tool" else "")
            + (f" Used by {used_by(p, votes)} agents." if used_by(p, votes) else "")
            for p in ps
        )
        for c, ps in groups.items()
    )


def splice(path, block):
    text = path.read_text()
    start, end = text.index(BEGIN) + len(BEGIN), text.index(END)
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

    votes = json.loads((ROOT / "votes.json").read_text())["tools"] if (ROOT / "votes.json").exists() else {}
    groups = by_category(products, votes)
    skill = (ROOT / "vote.md").read_text()
    if not SKILL_COPY.exists() or SKILL_COPY.read_text() != skill:
        if check:
            errors.append("plugins/marketing-engineering/skills/.../SKILL.md is stale: run python scripts/build.py")
        else:
            SKILL_COPY.parent.mkdir(parents=True, exist_ok=True)
            SKILL_COPY.write_text(skill)
    for name, block in (("README.md", readme_block(groups, votes)), ("llms.txt", llms_block(groups, votes))):
        path = ROOT / name
        new = splice(path, block)
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
