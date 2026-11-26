import { authCallback, notFound } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const GET = (request: Request) => authCallback(request);
export { notFound as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
