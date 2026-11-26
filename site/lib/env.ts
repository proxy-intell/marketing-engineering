// All config, read once from the environment. Empty (or blank: Cloud Run's placeholder secret) Resend or PostHog values turn that feature off.
const v = (name: string) => (process.env[name] ?? "").trim();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // Salt for IP hashes (rate limit, anonymous agent ids). Keep it the same across deploys.
  IP_SALT: process.env.IP_SALT ?? "",
  RESEND_API_KEY: v("RESEND_API_KEY"),
  RESEND_SEGMENT_ID: process.env.RESEND_SEGMENT_ID ?? "",
  RESEND_FROM: process.env.RESEND_FROM ?? "",
  RESEND_REPLY_TO: v("RESEND_REPLY_TO"),
  // Public project key (marketingengineering.dev org in PostHog EU). Safe in page code.
  POSTHOG_KEY: process.env.POSTHOG_KEY ?? "",
  // Sign-in (Auth0). All six must be set or sign-in is off: no UI, /auth/* and /v1/auth/* are 404s, /v1/me says signed_in:false.
  // Tenant hostname, e.g. the tenant's *.auth0.com name or its custom domain. Never committed.
  AUTH0_DOMAIN: v("AUTH0_DOMAIN"),
  // Regular Web App: the browser sign-in.
  AUTH0_CLIENT_ID: v("AUTH0_CLIENT_ID"),
  AUTH0_CLIENT_SECRET: v("AUTH0_CLIENT_SECRET"),
  // Native app with the Device Code grant: CLI and agent sign-in.
  AUTH0_CLI_CLIENT_ID: v("AUTH0_CLI_CLIENT_ID"),
  // Identifier of the Auth0 API the CLI's access tokens are issued for.
  AUTH0_AUDIENCE: v("AUTH0_AUDIENCE"),
  // Encrypts the session cookie. At least 32 random characters; changing it signs everyone out.
  AUTH_SESSION_SECRET: v("AUTH_SESSION_SECRET"),
  // Access-token claim holding the email (added by an Auth0 Action). Without it /v1/me asks the tenant's /userinfo.
  AUTH0_EMAIL_CLAIM: v("AUTH0_EMAIL_CLAIM") || "https://marketingengineering.dev/email",
};

export const authEnabled = () =>
  Boolean(env.AUTH0_DOMAIN && env.AUTH0_CLIENT_ID && env.AUTH0_CLIENT_SECRET && env.AUTH0_CLI_CLIENT_ID && env.AUTH0_AUDIENCE && env.AUTH_SESSION_SECRET.length >= 32);
