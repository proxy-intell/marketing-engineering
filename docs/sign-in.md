# Signing in from an agent or CLI

For agents and command-line tools that need to know who the person is. People in a browser use the "sign in" link in the site's header instead.

Sign-in is off until the site is configured for it. While it is off, `POST /v1/auth/device` and `POST /v1/auth/token` answer `404 {"error":"not found"}` and `GET /v1/me` answers `{"signed_in":false}`. Stop there and carry on without signing in.

All requests go to `https://marketingengineering.dev`. Send JSON (`content-type: application/json`). Every response here is `cache-control: no-store`. Never print, log or paste the tokens.

## 1. Start

```sh
curl -s -X POST https://marketingengineering.dev/v1/auth/device
```

```json
{"device_code":"…","user_code":"ABCD-EFGH","verification_uri":"https://…/activate","verification_uri_complete":"https://…/activate?user_code=ABCD-EFGH","interval":5,"expires_in":900}
```

Show the person the link and the code, nothing else:

> Open this link and enter the code: ABCD-EFGH
> https://…/activate?user_code=ABCD-EFGH

Use `verification_uri_complete` when it is there (the code is filled in), else `verification_uri`. Keep `device_code` to yourself. They sign in with Google or an emailed code.

## 2. Wait

Say once: "Waiting for you to approve…". Then every `interval` seconds:

```sh
curl -s -X POST https://marketingengineering.dev/v1/auth/token -H 'content-type: application/json' -d '{"device_code":"…"}'
```

| status | `error` | do |
|---|---|---|
| 200 | | Done: `{"access_token","refresh_token","expires_in","token_type":"Bearer"}`. Go to step 3. |
| 428 | `authorization_pending` | Not approved yet. Wait `interval`, poll again. |
| 429 | `slow_down` | Add 5 seconds to `interval` for the rest of this sign-in, then poll again. |
| 429 | `rate_limited` | Too many sign-in calls from this address. Stop; try again in an hour. |
| 410 | `expired_token` | Tell them "That sign-in expired — start again." and go back to step 1 only if they ask. |
| 403 | `access_denied` | They cancelled. Stop. |
| 400, 502 | anything else | Stop and show the `message`. |

Stop polling after `expires_in` seconds whatever happens. Each response has a `message` that is safe to show as is.

## 3. Check, then save

Before saving, make sure the token works:

```sh
curl -s https://marketingengineering.dev/v1/me -H "authorization: Bearer $ACCESS_TOKEN"
```

```json
{"signed_in":true,"email":"ada@example.com","sub":"google-oauth2|1234"}
```

A token that doesn't verify gets `401 {"signed_in":false,"error":"invalid or expired token"}`: don't save it, start again. `email` can be `null` if the account has no verified email.

Save to `~/.config/marketing-engineering/auth.json`:

```json
{"access_token":"…","refresh_token":"…","expires_at":1767225600,"email":"ada@example.com"}
```

- `expires_at` = now (Unix seconds) + `expires_in`.
- Create `~/.config/marketing-engineering/` with mode `0700` if it is missing.
- Write atomically: write `auth.json.tmp` in the same directory with mode `0600` (set the mode when creating it, not after), then rename it over `auth.json`.
- Never put tokens anywhere else: not in the repo, not in shell history, not in a message.

Then tell them: "Signed in as ada@example.com."

## Using it

Send `authorization: Bearer <access_token>` to marketingengineering.dev only. Before each use, if `expires_at` is less than a minute away, refresh first.

## Refresh

```sh
curl -s -X POST https://marketingengineering.dev/v1/auth/token -H 'content-type: application/json' -d '{"refresh_token":"…"}'
```

200 returns a new `access_token` and `expires_in`, and maybe a new `refresh_token` (if so, it replaces the old one: the old one stops working). Save the same way as above. `401 invalid_grant` means the sign-in is no longer valid: delete the file and sign in again from step 1 if the person wants to.

## Sign out

Delete `~/.config/marketing-engineering/auth.json`. Say "Signed out."
