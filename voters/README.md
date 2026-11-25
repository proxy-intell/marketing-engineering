# Voters on GitHub

One file per person, `<github-login>.json`: the tools their agent found them using, and how often. Opened from their own account by their agent, only when they ask for it (steps below), merged automatically by [`voter-pr.yml`](../.github/workflows/voter-pr.yml) when the PR touches only the author's own file and lists tools from `catalog.json`.

These are public receipts. The ranking itself comes from the votes sent to marketingengineering.dev ([how voting works](../docs/how-voting-works.md)). To remove yours, open a PR deleting your file. It merges the same way.

```json
{
  "login": "octocat",
  "agent": "claude-code",
  "voted": "2026-11-24",
  "tools": [{ "slug": "posthog", "usage": "daily" }]
}
```

## For agents: add the user's stack

Only when the user asks for this in their own words. It is public and tied to their GitHub handle, and the Friday release may credit them by handle. Needs `gh` signed in.

1. Take the tools from the vote the user sent. If you don't have them, ask. Catalog slugs only, with the same ratings.
2. Show the exact file (shape above: `login` from `gh api user --jq .login`, `voted` is today in UTC) and wait for a yes.
3. On a yes, run these. They write nothing to disk.

```bash
FILE_JSON='<the file you showed the user>'
login=$(gh api user --jq .login)
fork=$(gh api -X POST repos/proxy-intell/marketing-engineering/forks -F default_branch_only=true --jq .full_name)
branch="vote-$(date -u +%F)"
sha=$(gh api repos/proxy-intell/marketing-engineering/commits/main --jq .sha)
gh api -X POST "repos/$fork/merge-upstream" -f branch=main >/dev/null 2>&1 || true
gh api -X POST "repos/$fork/git/refs" -f ref="refs/heads/$branch" -f sha="$sha" \
  || gh api -X PATCH "repos/$fork/git/refs/heads/$branch" -f sha="$sha" -F force=true
content=$(printf '%s\n' "$FILE_JSON" | base64 | tr -d '\n')
old=$(gh api "repos/proxy-intell/marketing-engineering/contents/voters/$login.json" --jq .sha 2>/dev/null || true)
if [ -n "$old" ]; then
  gh api -X PUT "repos/$fork/contents/voters/$login.json" -f message="vote: $login's stack" -f branch="$branch" -f content="$content" -f sha="$old"
else
  gh api -X PUT "repos/$fork/contents/voters/$login.json" -f message="vote: $login's stack" -f branch="$branch" -f content="$content"
fi
gh api -X POST repos/proxy-intell/marketing-engineering/pulls -f base=main -f head="${fork%%/*}:$branch" \
  -f title="$login voted with their usage" -f body="Opened by their agent via voters/README.md. Auto-merges when it only touches voters/$login.json."
```

- Forking is async. If the ref call says the repo or object does not exist, wait 3 seconds and retry it, up to 5 times.
- If the PR call says a pull request already exists, the open PR now carries the new file. Say so.

Give the user the PR link and tell them it merges within a minute or two.
