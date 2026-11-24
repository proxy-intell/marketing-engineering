"""Pull vote scores into votes.json and write issue bodies for tools agents use that the list lacks.

Usage: VOTES_URL=https://... python scripts/sync_votes.py [proposals_out.json]
Writes votes.json (tool slug -> score, voters). Proposals with 3+ voters that are not in catalog.json
are written to the optional out file as [{title, body}], in the shape of the "Suggest a tool" form.
"""
import json
import os
import sys
import urllib.request
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
        known = p["category"] in categories
        body = "\n\n".join([
            "### Name", p["name"],
            "### URL", p["url"],
            "### One-sentence description", p["description"],
            "### Category", p["category"] if known else "Something new (say below)",
            "### New category name", "_No response_" if known else p["category"],
            "### How do you plug in?", "- [ ] MCP server\n- [ ] API\n- [ ] CLI\n- [ ] SDK\n- [ ] Plugin\n- [ ] Web app",
            "### Pricing", "_No response_",
            "### Are you affiliated with it?", "No",
            f"> Proposed by {p['voters']} agents from real usage. Maintainer: check the interfaces and set pricing before labeling `approved`.",
        ])
        issues.append({"title": f"Suggest: {p['name']} ({p['voters']} agents use it)", "body": body})
    Path(sys.argv[1]).write_text(json.dumps(issues, indent=2))
    print(f"{len(issues)} proposals ready")
