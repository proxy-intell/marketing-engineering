"""Add a catalog entry from a "Suggest a tool" issue form body (env ISSUE_BODY). Prints the slug.

Usage: ISSUE_BODY="$(cat body.md)" python scripts/issue_to_entry.py
"""
import datetime
import json
import os
import re
import sys
from pathlib import Path

CATALOG = Path(__file__).resolve().parent.parent / "catalog.json"
INTERFACES = {"MCP server": "mcp", "API": "api", "CLI": "cli", "SDK": "sdk", "Plugin": "plugin", "Web app": "web"}

sections = dict(re.findall(r"^### (.+?)\s*\n+(.*?)(?=\n### |\Z)", os.environ["ISSUE_BODY"], re.S | re.M))
field = lambda label: "" if sections.get(label, "").strip() in ("", "_No response_") else sections[label].strip()

name = field("Name")
url = field("URL")
category = field("Category")
if category.startswith("Something new"):
    category = field("New category name")
if not (name and url.startswith("https://") and category):
    sys.exit("Need a name, an https:// URL and a category.")

entry = {
    "slug": re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"),
    "name": name,
    "url": url,
    "description": field("One-sentence description"),
    "category": category,
    "interfaces": [v for k, v in INTERFACES.items() if f"- [X] {k}" in field("How do you plug in?")] or ["web"],
    "pricing": field("Pricing"),
}
if field("Remote MCP URL (optional)"):
    entry["mcp_url"] = field("Remote MCP URL (optional)")
if field("Maker's X handle (optional)"):
    entry["maker_x"] = field("Maker's X handle (optional)").lstrip("@")
entry["added"] = datetime.date.today().isoformat()

catalog = json.loads(CATALOG.read_text())
if any(p["slug"] == entry["slug"] for p in catalog["products"]):
    sys.exit(f"{entry['slug']} is already listed.")
catalog["products"] = sorted(catalog["products"] + [entry], key=lambda p: p["slug"])
CATALOG.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")
print(entry["slug"])
