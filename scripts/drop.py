"""Weekly drop: products added, tools that climbed, and people who voted on GitHub since a date (YYYY-MM-DD).
Prints nothing if there is none of the three. The email covers new products only.

Usage: python scripts/drop.py 2026-11-17            # release notes (markdown) to stdout
       python scripts/drop.py 2026-11-17 --prev-votes old.json   # also "Climbing" vs votes.json at the last drop
       python scripts/drop.py 2026-11-17 --resend   # also create a Resend broadcast DRAFT (never sends)
       python scripts/drop.py 2026-11-17 --email-json   # print the email (name, subject, html, text) as JSON, no network
Env for --resend: RESEND_API_KEY, RESEND_SEGMENT_ID, RESEND_FROM; optional RESEND_REPLY_TO, RESEND_API_URL (tests).
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
CMD = "vote on marketing engineering - https://marketingengineering.dev/vote.md"
UNSUB = "{{{RESEND_UNSUBSCRIBE_URL}}}"
e = html.escape
by_slug = {p["slug"]: p for p in products}
INK, PAPER, ORANGE, MUTE = "#181818", "#F3EFE3", "#FF5A1F", "#6b675c"
MONO, SANS = "font-family:'JetBrains Mono',Menlo,Consolas,monospace", "font-family:Inter,Helvetica,Arial,sans-serif"
NARROW, HEAVY = "font-family:'Archivo Narrow','Arial Narrow',Arial,sans-serif;font-weight:700", "font-family:Archivo,'Arial Black',Arial,sans-serif;font-weight:900"
# The logo's shapes, as bullets. ponytail: no diamond, Gmail drops CSS transforms.
SHAPES = [(ORANGE, "50%"), ("#2448FF", "0"), ("#FFC53D", "6px"), ("#F2B1DC", "50%"), ("#21A35B", "0"), ("#BCDAF3", "6px")]


def votes_for(slug):
    n = votes.get("tools", {}).get(slug, {}).get("voters", 0)
    return f"{n} vote{'s' if n != 1 else ''}"


def para(t, size=16, color=INK, margin="0 0 16px"):
    return f'<p style="margin:{margin};{SANS};font-size:{size}px;line-height:1.55;color:{color}">{t}</p>'


def heading(t, sub):
    return f'<tr><td style="padding:36px 0 6px"><div style="{HEAVY};font-size:44px;line-height:1;letter-spacing:-.02em;color:{INK}">{t}</div>{para(sub, margin="14px 0 0")}</td></tr>'


def rows(cells):
    out = []
    for i, (left, right) in enumerate(cells):
        line = f"border-top:2px solid {INK};" + (f"border-bottom:2px solid {INK};" if i == len(cells) - 1 else "")
        out.append(f'<tr>{left(line)}{right(line)}</tr>')
    return f'<tr><td style="padding:18px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{"".join(out)}</table></td></tr>'


def tool_cell(p, extra=""):
    return lambda line: (
        f'<td style="padding:16px 0;{line}"><a href="{e(p["url"])}" style="{NARROW};font-size:20px;color:{INK};text-decoration:none">{e(p["name"])}</a>'
        f' <span style="{MONO};font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:{MUTE}">&nbsp;{e(p["category"])}</span>'
        f'{para(e(p["description"]), 15, margin="4px 0 0")}{extra}</td>'
    )


def new_cells():
    for i, p in enumerate(new):
        color, radius = SHAPES[i % len(SHAPES)]
        handle = f' &nbsp;·&nbsp; <a href="https://x.com/{e(p["maker_x"])}" style="color:#2448FF;text-decoration:none">@{e(p["maker_x"])}</a>' if p.get("maker_x") else ""
        meta = f'<p style="margin:6px 0 0;{MONO};font-size:12px;color:{INK}">{votes_for(p["slug"])}{handle}</p>'
        shape = lambda line, c=color, r=radius: f'<td width="34" valign="top" style="padding:18px 0;{line}"><div style="width:22px;height:22px;background:{c};border-radius:{r}"></div></td>'
        yield shape, tool_cell(p, meta)


def climb_cells():
    for s, was, r in climbers:
        move = f"#{was}" if was else "new"
        yield tool_cell(by_slug[s]), lambda line, move=move, r=r: (
            f'<td align="right" style="padding:16px 0 16px 12px;{line}white-space:nowrap"><span style="{HEAVY};font-size:30px;line-height:1;color:{MUTE}">{move} &rarr;</span> '
            f'<span style="{HEAVY};font-size:30px;line-height:1;color:{ORANGE}">#{r}</span></td>'
        )


voters_now = votes.get("voters", 0)
gained = voters_now - prev.get("voters", 0)
voter_line = f"{voters_now} voter{'s' if voters_now != 1 else ''} now" + (f", {gained} new since last friday" if gained > 0 else "") + ". these moved up the most."
body = heading(f"{len(new)} new tool{'s' if len(new) != 1 else ''}", "people's agents started reporting these this week. here's what they are and who made them.")
body += rows(list(new_cells()))
if climbers:
    body += heading("climbing", voter_line) + rows(list(climb_cells()))
    body += f'<tr><td style="padding:16px 0 0"><a href="https://marketingengineering.dev/#rank" style="display:inline-block;background:{PAPER};color:{INK};border:2px solid {INK};text-decoration:none;{NARROW};font-size:15px;padding:10px 16px">see the rankings &rarr;</a></td></tr>'
body += (
    '<tr><td style="padding:32px 0 0">'
    + para("stack changed? or know someone who should be on here? the ranking only gets better with more votes.", margin="0 0 14px")
    + f'<div style="background:{INK};padding:12px 14px;margin:0 0 24px"><div style="{MONO};font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:{PAPER};margin:0 0 10px">give this to your agent</div>'
    f'<div style="background:#2a2a2a;color:{PAPER};padding:12px 14px;{MONO};font-size:13px;line-height:1.5;word-break:break-word"><span style="color:#8a8a8a">$</span> {e(CMD)}</div></div>'
    + para("see you next friday.<br>tanmay")
    + "</td></tr>"
)
top = climbers[0][0] if climbers else None
subject = f"{len(new)} new tool{'s' if len(new) != 1 else ''}" + (f", and {names[top]}'s climbing" if top else "")
listed = [p["name"] for p in new]
preview = (", ".join(listed[:-1]) + " and " + listed[-1] if len(listed) > 1 else "".join(listed)) + " made the list this week"
day = date.today()
email = {
    "name": f"Drop {day.isoformat()}",
    "subject": subject,
    "html": (
        f'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(subject)}</title></head>'
        f'<body style="margin:0;padding:0;background:{PAPER}"><div style="display:none;max-height:0;overflow:hidden">{e(preview)}</div>'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAPER}"><tr><td align="center" style="padding:32px 16px">'
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">'
        f'<tr><td style="padding:0 0 14px;border-bottom:2px solid {INK};{MONO};font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:{INK}">marketing engineering<span style="float:right;color:{MUTE}">friday drop · {day.strftime("%b")} {day.day}</span></td></tr>'
        f"{body}"
        f'<tr><td style="padding:20px 0 0;border-top:2px solid {INK};{MONO};font-size:11px;line-height:1.6;color:{MUTE}">you\'re getting this because you joined the friday drop on marketingengineering.dev. '
        f'<a href="{UNSUB}" style="color:{MUTE}">unsubscribe</a> · <a href="https://github.com/proxy-intell/marketing-engineering" style="color:{MUTE}">star the repo</a><br>{e(POSTAL)}</td></tr>'
        "</table></td></tr></table></body></html>"
    ),
    "text": "\n\n".join(
        [f"{len(new)} new tools this week."]
        + [f"{p['name']} ({p['category']}, {votes_for(p['slug'])}): {p['description']} {p['url']}" for p in new]
        + ([f"climbing. {voter_line}"] + [f"{names[s]}: " + (f"#{was} -> #{r}" if was else f"new at #{r}") for s, was, r in climbers] + ["https://marketingengineering.dev/#rank"] if climbers else [])
        + ["stack changed? give your agent this line:", CMD, "see you next friday.\ntanmay", f"--\n{POSTAL}\nunsubscribe: {UNSUB}"]
    ),
}

if "--email-json" in sys.argv:
    if new:
        print(json.dumps(email))
    sys.exit(0)

print("\n".join(lines).strip())

if "--resend" in sys.argv and new:
    payload = {**email, "from": os.environ["RESEND_FROM"], "segment_id": os.environ["RESEND_SEGMENT_ID"]}
    if os.environ.get("RESEND_REPLY_TO"):
        payload["reply_to"] = os.environ["RESEND_REPLY_TO"]
    req = urllib.request.Request(
        os.environ.get("RESEND_API_URL", "https://api.resend.com") + "/broadcasts",
        json.dumps(payload).encode(),
        {"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}", "Content-Type": "application/json", "User-Agent": "marketing-engineering-drop"},
    )
    print(f"\nResend broadcast draft: {json.load(urllib.request.urlopen(req, timeout=30)).get('id')}", file=sys.stderr)
