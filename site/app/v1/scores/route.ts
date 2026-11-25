import { db } from "@/lib/db";
import { scores, notFound } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const GET = () => scores(db());
export { notFound as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
