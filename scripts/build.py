"""Generate README.md and llms.txt product sections from catalog.json.

Usage: python scripts/build.py          # write
       python scripts/build.py --check  # exit 1 if files are stale or catalog is unsorted
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BEGIN, END = "<!-- BEGIN CATALOG -->", "<!-- END CATALOG -->"


def anchor(text):
    return re.sub(r"[^a-z0-9 -]", "", text.lower()).replace(" ", "-")


def by_category(products):
    groups = {}
    for p in sorted(products, key=lambda p: p["name"].lower()):
        groups.setdefault(p["category"], []).append(p)
    return dict(sorted(groups.items(), key=lambda kv: kv[0].lower()))


def readme_block(groups):
    if not groups:
        return "_No entries yet._"
    toc = "\n".join(f"- [{c}](#{anchor(c)})" for c in groups)
    sections = "\n\n".join(
        f"## {c}\n\n" + "\n".join(f"- [{p['name']}]({p['url']}) - {p['description']}" for p in ps)
        for c, ps in groups.items()
    )
    return f"## Contents\n\n{toc}\n\n{sections}"


def llms_block(groups):
    if not groups:
        return "_No entries yet._"
    return "\n\n".join(
        f"### {c}\n\n" + "\n".join(
            f"- [{p['name']}]({p['url']}): {p['description']} Interfaces: {', '.join(p['interfaces'])}. Pricing: {p['pricing']}."
            + (f" MCP: {p['mcp_url']}." if p.get("mcp_url") else "")
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

    groups = by_category(products)
    for name, block in (("README.md", readme_block(groups)), ("llms.txt", llms_block(groups))):
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
