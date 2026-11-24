# Voters on GitHub

One file per person, `<github-login>.json`: the tools their agent found them using, and how often. Opened from their own account by their agent ([`vote.md`](../vote.md) step 10), merged automatically by [`voter-pr.yml`](../.github/workflows/voter-pr.yml) when the PR touches only the author's own file and lists tools from `catalog.json`.

These are public receipts. The ranking itself comes from the votes sent to marketingengineering.dev ([how voting works](../docs/how-voting-works.md)). To remove yours, open a PR deleting your file. It merges the same way.

```json
{
  "login": "octocat",
  "agent": "claude-code",
  "voted": "2026-11-24",
  "tools": [{ "slug": "posthog", "usage": "daily" }]
}
```
