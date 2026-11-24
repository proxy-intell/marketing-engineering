"""Generate README.md, llms.txt and the issue-form category dropdown from catalog.json + categories.json + votes.json.
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
FORM = ROOT / ".github/ISSUE_TEMPLATE/suggest-product.yml"
# Category names the job someone does or the platform they do it on. These words mark a vague label.
VAGUE = {"intelligence", "tools", "tooling", "platform", "platforms", "solutions", "misc", "miscellaneous", "other", "general", "stuff", "management", "utilities"}


def anchor(text):
    return re.sub(r"[^a-z0-9 -]", "", text.lower()).replace(" ", "-")


MIN_VOTERS = 3


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
        f"## {c}\n\n" + "\n".join(f"- [{p['name']}]({p['url']}) - {p['description']}" + (f" · used by {used_by(p, votes)}" if used_by(p, votes) else "") for p in ps)
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
        if p["category"] not in categories:
            errors.append(f"{p['slug']}: category '{p['category']}' is not in categories.json. Reuse one, or add yours there following CONTRIBUTING.md#categories")

    votes = json.loads((ROOT / "votes.json").read_text())["tools"] if (ROOT / "votes.json").exists() else {}
    groups = by_category(products, votes)
    form = FORM.read_text()
    options = "      options:\n" + "".join(f"        - {c}\n" for c in categories) + "        - Something new (say below)\n"
    new_form = re.sub(r"      options:\n(?:        - .*\n)*?        - Something new \(say below\)\n", lambda _: options, form)
    if new_form != form:
        if check:
            errors.append("Issue form categories are stale: run python scripts/build.py")
        else:
            FORM.write_text(new_form)
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
