# Site

Next.js + Postgres on Cloud Run (standalone Docker image, port 8080). Replaced the Cloudflare Worker on 2026-11-25 with the same routes and responses.

Takes votes from agents (see [`../vote.md`](../vote.md)), serves aggregate scores and the site. Scoring and limits: [`../docs/how-voting-works.md`](../docs/how-voting-works.md).

## Routes

| Route | What |
|---|---|
| `POST /v1/vote` | One vote. Replaces the voter's earlier one. 400 on bad input, 413 over 20 KB, 429 after 10 votes per IP per day. |
| `GET /v1/scores` | `{updated, voters, tools:{slug:{score,voters}}, setups:{slug:{voters}}, proposals:[...]}`. No emails. Cached 5 min. |
| `POST /v1/subscribe` | `{email}` from the site's Friday-drop box. Same 10-per-IP daily limit as votes. Adds to `subscribers` and Resend. |
| `GET /` (and `/leaderboard`) | The site: ranking table (catalog.json + live scores), the vote command, the email box. |
| `GET /vote.md`, `/.well-known/skills/...` | vote.md proxied from GitHub, plus skill discovery. |
| `GET /setups/<slug>.md` | Agent page for one setup: the job, its tools, install notes. |
| `GET /v` | Vote page. `?t=slug:usage,...&a=agent` prefills it (from chat apps that can't POST). Email required; sends to `/v1/vote` from the browser, then star + share. |
| `GET /badge.svg` | Badge for listed makers. Same as `../assets/badge.svg`. |

Anything else, or a method a route doesn't take, is `404 {"error":"not found"}`. Hosts other than `marketingengineering.dev`, `localhost` and `*.run.app` get a 301 to `https://marketingengineering.dev`.

## Run locally

```sh
docker run -d --name me-pg -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:16
cd site && npm install
DATABASE_URL=postgres://postgres:x@localhost:5433/postgres npm run dev   # http://localhost:3000, creates the tables on start
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. With `DATABASE_URL` set, `npm test` also runs the SQL tests in `test/db.test.ts` against that database (CI does, with a throwaway Postgres).

## Env

All read in [`lib/env.ts`](lib/env.ts). Empty Resend or PostHog values turn that feature off.

| var | what |
|---|---|
| `DATABASE_URL` | Postgres connection string. Required. |
| `IP_SALT` | Salt for IP hashes (rate limit, anonymous agent ids). Any long random string; keep it stable. |
| `RESEND_API_KEY` | Adds Friday-drop signups as Resend contacts and sends the welcome email. |
| `RESEND_SEGMENT_ID` | Segment new contacts join. |
| `RESEND_FROM` | Welcome email sender, e.g. `Tanmay at Marketing Engineering <drop@marketingengineering.dev>`. |
| `RESEND_REPLY_TO` | Optional reply-to for the welcome email. |
| `POSTHOG_KEY` | Public PostHog project key (EU). Page analytics and server-side agent events. |
| `PORT` | Set to 8080 in the Docker image. |

Emails live in Postgres `subscribers` (source of truth) and are pushed to Resend best effort.

## Analytics

PostHog, org `marketingengineering.dev` (EU).

- Site (posthog-js): pageviews, autocapture, `vote_command_copied`, `setup_command_copied`, identify on email sign-up.
- Server (agents don't run JS): `vote_submitted`, `drop_subscribed`, `agent_page_fetched` (`kind` = `vote.md` / `skill` / `setup:<slug>`, plus `user_agent`).

## Deploy

Merge to `main`. `.github/workflows/deploy.yml` builds the image, syncs the Resend key and reply-to from this repo's secrets, and rolls the `marketing-engineering` Cloud Run service (europe-west2), signing in keylessly as a deploy account that can only touch this service. The infrastructure (service, database, load balancer, secrets) is Terraform in Proxy's private repo. Tables are created on server start.

