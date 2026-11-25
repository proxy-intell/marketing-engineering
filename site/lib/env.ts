// All config, read once from the environment. Empty (or blank: Cloud Run's placeholder secret) Resend or PostHog values turn that feature off.
export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  // Salt for IP hashes (rate limit, anonymous agent ids). Keep it the same across deploys.
  IP_SALT: process.env.IP_SALT ?? "",
  RESEND_API_KEY: (process.env.RESEND_API_KEY ?? "").trim(),
  RESEND_SEGMENT_ID: process.env.RESEND_SEGMENT_ID ?? "",
  RESEND_FROM: process.env.RESEND_FROM ?? "",
  RESEND_REPLY_TO: (process.env.RESEND_REPLY_TO ?? "").trim(),
  // Public project key (marketingengineering.dev org in PostHog EU). Safe in page code.
  POSTHOG_KEY: process.env.POSTHOG_KEY ?? "",
};
