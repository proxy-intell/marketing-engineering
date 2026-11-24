"""Print release notes for products added since a date (YYYY-MM-DD). Prints nothing if none.

Usage: python scripts/drop.py 2026-11-17
"""
import json
import sys
from pathlib import Path

since = sys.argv[1]
products = json.loads((Path(__file__).resolve().parent.parent / "catalog.json").read_text())["products"]
new = sorted((p for p in products if p["added"] > since), key=lambda p: (p["category"], p["name"].lower()))
if not new:
    sys.exit(0)

lines = [f"{len(new)} new this week.", ""]
for p in new:
    by = f" (by [x.com/{p['maker_x']}](https://x.com/{p['maker_x']}))" if p.get("maker_x") else ""
    lines.append(f"- **[{p['name']}]({p['url']})**{by} · {p['category']} · {p['description']}")

lines += ["", "<details><summary>Draft X posts</summary>", ""]
for p in new:
    credit = f" by @{p['maker_x']}" if p.get("maker_x") else ""
    lines += ["```", f"New on Marketing Engineering: {p['name']}{credit}. {p['description']}", "github.com/proxy-intell/marketing-engineering", "```"]
lines.append("</details>")
print("\n".join(lines))
