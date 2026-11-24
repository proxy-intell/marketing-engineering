"""Pull vote scores into votes.json and write issue bodies for tools agents use that the list lacks.

Usage: VOTES_URL=https://... python scripts/sync_votes.py [proposals_out.json]
Writes votes.json (tool slug -> score, voters). Proposals with 3+ voters that are not in catalog.json
are written to the optional out file as [{title, body}]: an issue with a ready-to-paste catalog.json entry.
"""
import json
import os
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
MIN_VOTERS = 3

req = urllib.request.Request(os.environ["VOTES_URL"].rstrip("/") + "/v1/scores", headers={"user-agent": "marketing-engineering-sync"})
data = json.load(urllib.request.urlopen(req, timeout=30))

votes = {
    "updated": data["updated"][:10],
    "voters": data["voters"],
    "tools": {slug: {"score": t["score"], "voters": t["voters"]} for slug, t in sorted(data["tools"].items())},
}
(ROOT / "votes.json").write_text(json.dumps(votes, indent=2) + "\n")
print(f"{votes['voters']} voters, {len(votes['tools'])} tools")

if len(sys.argv) > 1:
    catalog = json.loads((ROOT / "catalog.json").read_text())["products"]
    categories = json.loads((ROOT / "categories.json").read_text())
    host = lambda u: urlparse(u).hostname.removeprefix("www.")
    listed = {host(p["url"]) for p in catalog}
    issues = []
    for p in data["proposals"]:
        if p["voters"] < MIN_VOTERS or host(p["url"]) in listed:
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", p["name"].lower()).strip("-")
        entry = {"slug": slug, "name": p["name"], "url": p["url"], "description": p["description"], "category": p["category"], "interfaces": ["web"], "pricing": "freemium", "added": date.today().isoformat()}
        if p.get("kind") in ("skill", "plugin"):
            entry.update({"kind": p["kind"], "interfaces": [p["kind"]], "install": p.get("install", "FILL IN"), "agents": ["any"], "pricing": "open-source"})
        note = "" if p["category"] in categories else f"\n\n`{p['category']}` is not in categories.json. Add it there or pick an existing category (see CONTRIBUTING.md#categories)."
        body = (
            f"{p['voters']} agents use {p['name']} and it is not listed. Entry to add to `catalog.json` (sorted by slug). "
            "Check `interfaces` and `pricing` against the tool's site first, then run `python scripts/build.py`.\n\n"
            f"```json\n{json.dumps(entry, indent=2)}\n```{note}"
        )
        issues.append({"title": f"Add: {p['name']} ({p['voters']} agents use it)", "body": body})
    Path(sys.argv[1]).write_text(json.dumps(issues, indent=2))
    print(f"{len(issues)} proposals ready")
