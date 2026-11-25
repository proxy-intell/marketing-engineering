# Votes endpoint

Cloudflare Worker + D1. Takes votes from agents (see [`../vote.md`](../vote.md)), serves aggregate scores. Scoring and limits: [`../docs/how-voting-works.md`](../docs/how-voting-works.md).

| Route | What |
|---|---|
| `POST /v1/vote` | One vote. Replaces the voter's earlier one. 400 on bad input, 429 after 10 votes per IP per day. |
| `GET /v1/scores` | `{updated, voters, tools:{slug:{score,voters}}, setups:{slug:{voters}}, proposals:[...]}`. No emails. Cached 5 min. |
| `POST /v1/subscribe` | `{email}` from the site's Friday-drop box. Same 10-per-IP daily limit as votes. Adds to `subscribers` and Resend. |
| `GET /` | The site: ranking table (catalog.json + live scores), the vote command, the email box. |
| `GET /vote.md`, `/.well-known/skills/...` | vote.md proxied from GitHub, plus skill discovery. |
| `GET /setups/<slug>.md` | Agent page for one setup: the job, its tools, install notes. |
| `GET /v` | Vote page. `?t=slug:usage,...&a=agent` prefills it (from chat apps that can't POST). Email required; sends to `/v1/vote` from the browser, then star + share. |
| `GET /badge.svg` | Badge for listed makers. Same as `../assets/badge.svg`. |

## Test

```sh
cd worker && node --test          # validation, scoring, site render
npx wrangler d1 execute marketing-engineering-votes --local --file=schema.sql
npx wrangler dev --local          # then curl localhost:8787
```

## Deploy

```sh
cd worker
npx wrangler d1 create marketing-engineering-votes   # paste database_id into wrangler.toml
npx wrangler d1 execute marketing-engineering-votes --remote --file=schema.sql
npx wrangler secret put IP_SALT                      # any long random string
npx wrangler secret put RESEND_API_KEY               # optional, adds Friday-drop signups as Resend contacts
npx wrangler deploy
```

`RESEND_SEGMENT_ID` is a plain variable in `wrangler.toml`, not a secret.

Then:

1. Live at `https://marketingengineering.dev` (custom domain in `wrangler.toml`, `workers_dev` off). Any other host (www, other TLDs) redirects to it.
2. The URL is written into [`../vote.md`](../vote.md).
3. Set the repo variable `VOTES_URL` (Settings → Secrets and variables → Actions → Variables) so `sync-votes.yml` runs.

Emails live in D1 `subscribers` (source of truth) and are pushed to Resend best effort. Export: `npx wrangler d1 execute marketing-engineering-votes --remote --command "SELECT email FROM subscribers"`.

## Friday email draft

`weekly-drop.yml` also creates a Resend broadcast **draft** (never sends) when these are set in the repo (Settings → Secrets and variables → Actions):

| | name | value |
|---|---|---|
| secret | `RESEND_API_KEY` | key with access to contacts and broadcasts |
| variable | `RESEND_SEGMENT_ID` | segment the Worker adds signups to (same id as the Worker's `RESEND_SEGMENT_ID`) |
| variable | `RESEND_FROM` | `Marketing Engineering <drop@marketingengineering.dev>` (verified in Resend) |

Review the draft in Resend on Friday and press send.

## Analytics

PostHog, org `marketingengineering.dev` (EU). Public key is `POSTHOG_KEY` in `src/leaderboard.js`.

- Site (posthog-js): pageviews, autocapture, `vote_command_copied`, `setup_command_copied`, identify on email sign-up.
- Worker (server-side, agents don't run JS): `vote_submitted`, `drop_subscribed`, `agent_page_fetched` (`kind` = `vote.md` / `skill` / `setup:<slug>`, plus `user_agent`).
- GitHub: `.github/workflows/github-stats.yml` sends `github_repo_stats` daily, plus `github_views`, `github_clones` and `github_referrer_14d` once the `TRAFFIC_TOKEN` secret is set.
