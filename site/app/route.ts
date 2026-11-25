// GET / : the site. Any other method is a 404, like every route here (the worker's contract, not Next's 405).
import { db } from "@/lib/db";
import { home, notFound } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const GET = () => home(db());
export { notFound as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
