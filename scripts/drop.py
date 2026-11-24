"""Weekly drop for products added since a date (YYYY-MM-DD). Prints nothing if none.

Usage: python scripts/drop.py 2026-11-17            # release notes (markdown) to stdout
       python scripts/drop.py 2026-11-17 --resend   # also create a Resend broadcast DRAFT (never sends)
Env for --resend: RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM; optional RESEND_API_URL (tests).
"""
import html
import json
import os
import sys
import urllib.request
from datetime import date
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

if "--resend" in sys.argv:
    e = html.escape
    items = "".join(
        f'<li><p><a href="{e(p["url"])}"><b>{e(p["name"])}</b></a> · {e(p["category"])}<br>{e(p["description"])}</p></li>'
        for p in new
    )
    body = (
        f"<p>{len(new)} new tools on the list this week.</p><ul>{items}</ul>"
        '<p>the list ranks tools by what people actually use. tell your agent: '
        '<code>Read https://raw.githubusercontent.com/proxy-intell/marketing-engineering/main/vote.md and follow it.</code></p>'
        '<p><a href="https://github.com/proxy-intell/marketing-engineering">github.com/proxy-intell/marketing-engineering</a> · '
        '<a href="{{{RESEND_UNSUBSCRIBE_URL}}}">unsubscribe</a></p>'
    )
    payload = {
        "name": f"Drop {date.today().isoformat()}",
        "from": os.environ["RESEND_FROM"],
        "subject": f"Marketing Engineering: {len(new)} new tool{'s' if len(new) != 1 else ''}",
        "segment_id": os.environ["RESEND_SEGMENT_ID"],
        "html": body,
    }
    req = urllib.request.Request(
        os.environ.get("RESEND_API_URL", "https://api.resend.com") + "/broadcasts",
        json.dumps(payload).encode(),
        {"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Content-Type": "application/json", "User-Agent": "marketing-engineering-drop"},
    )
    print(f"\nResend broadcast draft: {json.load(urllib.request.urlopen(req, timeout=30)).get('id')}", file=sys.stderr)
