"""Copy GitHub repo traffic and counts into PostHog. Idempotent: per-day events use deterministic uuids.

Env: GH_TOKEN (fine-grained PAT, Administration: read), REPO (owner/name), POSTHOG_KEY, POSTHOG_HOST.
Events (distinct_id "github:<repo>", no person profile):
  github_repo_traffic_daily  one per complete day in GitHub's 14-day window: views, uniques, clones
  github_repo_snapshot       one per run day: stars, forks, watchers, open issues, 14-day referrers + paths
"""
import datetime
import json
import os
import urllib.request
import uuid

REPO = os.environ["REPO"]
DISTINCT_ID = f"github:{REPO}"


def gh(path):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}{path}",
        headers={"Authorization": f"Bearer {os.environ['GH_TOKEN']}", "Accept": "application/vnd.github+json"},
    )
    return json.load(urllib.request.urlopen(req))


def event(name, day, props, timestamp=None):
    return {
        "event": name,
        "timestamp": timestamp or f"{day}T23:59:00Z",
        "uuid": str(uuid.uuid5(uuid.NAMESPACE_URL, f"{REPO}/{name}/{day}")),
        "properties": {"distinct_id": DISTINCT_ID, "$process_person_profile": False, "repo": REPO, **props},
    }


today = datetime.date.today().isoformat()
views = {v["timestamp"][:10]: v for v in gh("/traffic/views")["views"]}
clones = {c["timestamp"][:10]: c for c in gh("/traffic/clones")["clones"]}
events = [
    event("github_repo_traffic_daily", day, {
        "views": views.get(day, {}).get("count", 0),
        "unique_views": views.get(day, {}).get("uniques", 0),
        "clones": clones.get(day, {}).get("count", 0),
        "unique_clones": clones.get(day, {}).get("uniques", 0),
    })
    for day in sorted(set(views) | set(clones))
    if day < today  # today's bucket is still filling
]

repo = gh("")
events.append(event("github_repo_snapshot", today, {
    "stars": repo["stargazers_count"],
    "forks": repo["forks_count"],
    "watchers": repo["subscribers_count"],
    "open_issues": repo["open_issues_count"],
    "referrers_14d": gh("/traffic/popular/referrers"),
    "paths_14d": [{"path": p["path"], "count": p["count"], "uniques": p["uniques"]} for p in gh("/traffic/popular/paths")],
}, timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat()))

body = json.dumps({"api_key": os.environ["POSTHOG_KEY"], "batch": events}).encode()
req = urllib.request.Request(f"{os.environ['POSTHOG_HOST']}/batch/", body, {"Content-Type": "application/json"})
urllib.request.urlopen(req)
print(f"Sent {len(events)} events")
