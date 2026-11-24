"""Weekly drop: products added, tools that climbed, and people who voted on GitHub since a date (YYYY-MM-DD).
Prints nothing if there is none of the three. The email covers new products only.

Usage: python scripts/drop.py 2026-11-17            # release notes (markdown) to stdout
       python scripts/drop.py 2026-11-17 --prev-votes old.json   # also "Climbing" vs votes.json at the last drop
       python scripts/drop.py 2026-11-17 --resend   # also create a Resend broadcast DRAFT (never sends)
       python scripts/drop.py 2026-11-17 --email-json   # print the email (name, subject, html, text) as JSON, no network
Env for --resend: RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM; optional RESEND_API_URL (tests).
"""
import html
import json
import os
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
since = sys.argv[1]
products = json.loads((ROOT / "catalog.json").read_text())["products"]
names = {p["slug"]: p["name"] for p in products}
new = sorted((p for p in products if p["added"] > since), key=lambda p: (p["category"], p["name"].lower()))


def ranks(votes):
    """Overall rank (1 = highest score) of each listed tool with votes. Ties share a rank."""
    scores = {s: t["score"] for s, t in votes.get("tools", {}).items() if s in names and t["score"] > 0}
    return {s: 1 + sum(x > v for x in scores.values()) for s, v in scores.items()}


votes = json.loads((ROOT / "votes.json").read_text()) if (ROOT / "votes.json").exists() else {}
prev = {}
if "--prev-votes" in sys.argv:
    path = Path(sys.argv[sys.argv.index("--prev-votes") + 1])
    prev = json.loads(path.read_text()) if path.exists() else {}
now_rank, prev_rank = ranks(votes), ranks(prev)
# Climbed since the last drop, biggest jump first. A tool with no rank before is new to the ranking.
climbers = sorted(
    ((s, prev_rank.get(s), r) for s, r in now_rank.items() if prev and (s not in prev_rank or r < prev_rank[s])),
    key=lambda c: (-((c[1] or len(now_rank) + 1) - c[2]), c[2]),
)[:5]
github_voters = sorted(
    (v["login"] for f in (ROOT / "voters").glob("*.json") if (v := json.loads(f.read_text())).get("voted", "") > since),
    key=str.lower,
)
if not (new or climbers or github_voters):
    sys.exit(0)

lines = []
if new:
    lines += [f"{len(new)} new this week.", ""]
    for p in new:
        by = f" (by [x.com/{p['maker_x']}](https://x.com/{p['maker_x']}))" if p.get("maker_x") else ""
        lines.append(f"- **[{p['name']}]({p['url']})**{by} · {p['category']} · {p['description']}")
    lines.append("")

if climbers:
    gained = votes.get("voters", 0) - prev.get("voters", 0)
    lines += ["### Climbing", "", f"{votes.get('voters', 0)} voter{'s' if votes.get('voters', 0) != 1 else ''}" + (f", {gained} new since the last drop." if gained > 0 else "."), ""]
    for s, was, r in climbers:
        lines.append(f"- **{names[s]}** " + (f"#{was} → #{r}" if was else f"new at #{r}"))
    lines.append("")

if github_voters:
    lines += ["### Voted on GitHub", "", ", ".join(f"@{v}" for v in github_voters) + ". Your agent can add you too: https://marketingengineering.dev/vote.md", ""]

if new:
    lines += ["<details><summary>Draft X posts</summary>", ""]
    for p in new:
        credit = f" by @{p['maker_x']}" if p.get("maker_x") else ""
        lines += ["```", f"New on Marketing Engineering: {p['name']}{credit}. {p['description']}", "github.com/proxy-intell/marketing-engineering", "```"]
    lines.append("</details>")

POSTAL = "Proxy Intelligence Inc., 131 Continental Dr, Suite 305, Newark, DE 19713, US"
VOTE = "Read https://marketingengineering.dev/vote.md and follow it."
e = html.escape
items = "".join(
    f'<li><p><a href="{e(p["url"])}"><b>{e(p["name"])}</b></a> · {e(p["category"])}<br>{e(p["description"])}</p></li>'
    for p in new
)
email = {
    "name": f"Drop {date.today().isoformat()}",
    "subject": f"Marketing Engineering: {len(new)} new tool{'s' if len(new) != 1 else ''}",
    "html": (
        f"<p>{len(new)} new tools on the list this week.</p><ul>{items}</ul>"
        "<p>the list ranks tools by what people actually use. tell your agent: "
        f"<code>{VOTE}</code></p>"
        '<p><a href="https://github.com/proxy-intell/marketing-engineering">github.com/proxy-intell/marketing-engineering</a> · '
        '<a href="https://marketingengineering.dev">ranking</a></p>'
        f'<p style="color:#777;font-size:12px">{e(POSTAL)}<br><a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}">unsubscribe</a></p>'
    ),
    "text": (
        f"{len(new)} new tools on the list this week.\n\n"
        + "\n".join(f"- {p['name']} ({p['category']}): {p['description']} {p['url']}" for p in new)
        + f"\n\nthe list ranks tools by what people actually use. tell your agent: {VOTE}\n"
        "https://github.com/proxy-intell/marketing-engineering | https://marketingengineering.dev\n\n"
        f"{POSTAL}\nunsubscribe: {{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}"
    ),
}

if "--email-json" in sys.argv:
    if new:
        print(json.dumps(email))
    sys.exit(0)

print("\n".join(lines).strip())

if "--resend" in sys.argv and new:
    payload = {**email, "from": os.environ["RESEND_FROM"], "segment_id": os.environ["RESEND_SEGMENT_ID"]}
    req = urllib.request.Request(
        os.environ.get("RESEND_API_URL", "https://api.resend.com") + "/broadcasts",
        json.dumps(payload).encode(),
        {"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Content-Type": "application/json", "User-Agent": "marketing-engineering-drop"},
    )
    print(f"\nResend broadcast draft: {json.load(urllib.request.urlopen(req, timeout=30)).get('id')}", file=sys.stderr)
