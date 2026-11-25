import { db } from "./db";
import { SCHEMA } from "./schema";

export async function migrate() {
  if (process.env.DATABASE_URL) await db().unsafe(SCHEMA);
}
