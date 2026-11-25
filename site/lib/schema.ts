// Applied at server start (instrumentation.ts) and by the DB tests. Every statement is idempotent.
// Times are epoch milliseconds (BIGINT: they overflow INTEGER). payload is the vote as JSON text.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS votes (
  install_id TEXT PRIMARY KEY,
  email_hash TEXT,
  agent TEXT NOT NULL,
  updated_at BIGINT NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS votes_email_hash ON votes (email_hash);

CREATE TABLE IF NOT EXISTS subscribers (
  email_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate (
  ip_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (ip_hash, day)
);
`;
