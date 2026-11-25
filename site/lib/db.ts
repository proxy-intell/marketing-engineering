import postgres from "postgres";
import { env } from "./env";

let client: postgres.Sql | undefined;

// Lazy, so `next build` and the tests never open a connection.
// Small pool: up to 2 instances share one Cloud SQL instance with Proxy.
export function db(): postgres.Sql {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return (client ??= postgres(env.DATABASE_URL, { max: 3, idle_timeout: 20 }));
}
