import { db } from "@/lib/db";
import { vote, notFound } from "@/lib/handlers";

export const POST = (request: Request) => vote(request, db());
export { notFound as GET, notFound as HEAD, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
