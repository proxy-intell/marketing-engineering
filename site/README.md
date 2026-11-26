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
| `GET /v` | Vote page. `?t=slug:usage,...&a=agent` prefills it (the link every agent hands over, see vote.md). Email required; sends to `/v1/vote` from the browser, then shows rank, setups, star + share. |
| `GET /badge.svg` | Badge for listed makers. Same as `../assets/badge.svg`. |
| `GET /auth/login?returnTo=` | Browser sign-in (Auth0, code + PKCE). `returnTo` must be `/` or `/v`, optionally with `?…`/`#…`; anything else lands on `/`. |
| `GET /auth/callback` | Back from Auth0: checks state, swaps the code, verifies the id token, sets the `me_session` cookie (encrypted, HttpOnly, SameSite=Lax, Secure). |
| `POST /auth/logout` | Header's sign-out button. 403 unless `Origin` is this site. Clears the cookie and ends the Auth0 session. |
| `GET /v1/me` | `{signed_in:false}` or `{signed_in:true, email, sub}` from the cookie or `Authorization: Bearer <access token>`. A bad bearer token is a 401. `no-store`. |
| `POST /v1/auth/device` | CLI/agent sign-in, step 1: proxies Auth0's device code request so the tenant host stays out of the repo. See [`../docs/sign-in.md`](../docs/sign-in.md). |
| `POST /v1/auth/token` | `{device_code}` to poll, `{refresh_token}` to refresh. Passes Auth0's `authorization_pending` (428), `slow_down` (429), `expired_token` (410), `access_denied` (403). Both auth calls share 300 per IP per hour, counted apart from votes. |

Sign-in is off unless every Auth0 variable below is set: then there is no sign-in link, the `/auth/*` and `/v1/auth/*` routes are 404s and `/v1/me` says `{signed_in:false}`. Signed-in state is fetched by the page after load, so `/` and `/v` stay publicly cacheable.

Anything else, or a method a route doesn't take, is `404 {"error":"not found"}`. Hosts other than `marketingengineering.dev`, `localhost` and `*.run.app` get a 301 to `https://marketingengineering.dev`.

## Run locally

```sh
docker run -d --name me-pg -e POSTGRES_PASSWORD=x -p 5433:5432 postgres:16
cd site && npm install
DATABASE_URL=postgres://postgres:x@localhost:5433/postgres npm run dev   # http://localhost:3000, creates the tables on start
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. With `DATABASE_URL` set, `npm test` also runs the SQL tests in `test/db.test.ts` against that database (CI does, with a throwaway Postgres).

## Env

All read in [`lib/env.ts`](lib/env.ts). Empty Resend or PostHog values turn that feature off; sign-in needs all six required `AUTH*` values.

| var | what |
|---|---|
| `DATABASE_URL` | Postgres connection string. Required. |
| `IP_SALT` | Salt for IP hashes (rate limit, anonymous agent ids). Any long random string; keep it stable. |
| `RESEND_API_KEY` | Adds Friday-drop signups as Resend contacts and sends the welcome email. |
| `RESEND_SEGMENT_ID` | Segment new contacts join. |
| `RESEND_FROM` | Welcome email sender, e.g. `Tanmay at Marketing Engineering <drop@marketingengineering.dev>`. |
| `RESEND_REPLY_TO` | Optional reply-to for the welcome email. |
| `POSTHOG_KEY` | Public PostHog project key (EU). Page analytics and server-side agent events. |
| `AUTH0_DOMAIN` | Auth0 tenant hostname (or its custom domain), no `https://`. Sign-in. |
| `AUTH0_CLIENT_ID` | Regular Web App client id (browser sign-in). |
| `AUTH0_CLIENT_SECRET` | Regular Web App client secret. Secret. |
| `AUTH0_CLI_CLIENT_ID` | Native app client id with the Device Code grant (CLI and agent sign-in). |
| `AUTH0_AUDIENCE` | Identifier of the Auth0 API that CLI access tokens are issued for. |
| `AUTH_SESSION_SECRET` | Encrypts the session cookie. 32+ random characters. Secret; changing it signs everyone out. |
| `AUTH0_EMAIL_CLAIM` | Optional. Access-token claim with the email, default `https://marketingengineering.dev/email` (set by an Auth0 Action). Without it, `/v1/me` asks Auth0's `/userinfo` and caches the email 5 min per user. |
| `PORT` | Set to 8080 in the Docker image. |

Emails live in Postgres `subscribers` (source of truth) and are pushed to Resend best effort.

## Analytics

PostHog, org `marketingengineering.dev` (EU).

- Site (posthog-js): pageviews, autocapture, `vote_command_copied`, `setup_command_copied`, identify on email sign-up.
- Server (agents don't run JS): `vote_submitted`, `drop_subscribed`, `agent_page_fetched` (`kind` = `vote.md` / `skill` / `setup:<slug>`, plus `user_agent`), `signed_in` (`surface` = `web` / `cli`, distinct id = Auth0 `sub`, no email).

## Deploy

Merge to `main`. `.github/workflows/deploy.yml` builds the image, syncs the Resend key and reply-to from this repo's secrets, and rolls the `marketing-engineering` Cloud Run service (europe-west2), signing in keylessly as a deploy account that can only touch this service. The infrastructure (service, database, load balancer, secrets) is Terraform in Proxy's private repo. Tables are created on server start.

