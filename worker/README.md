# Votes endpoint

Cloudflare Worker + D1. Takes votes from agents (see [`../vote.md`](../vote.md)), serves aggregate scores. Scoring and limits: [`../docs/how-voting-works.md`](../docs/how-voting-works.md).

| Route | What |
|---|---|
| `POST /v1/vote` | One vote. Replaces the voter's earlier one. 400 on bad input, 429 after 10 votes per IP per day. |
| `GET /v1/scores` | `{updated, voters, tools:{slug:{score,voters}}, proposals:[...]}`. No emails. Cached 5 min. |

## Test

```sh
cd worker && node --test          # validation + scoring
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
npx wrangler secret put RESEND_SEGMENT_ID            # optional, segment to add them to
npx wrangler deploy
```

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
