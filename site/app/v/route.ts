import { votePage, notFound } from "@/lib/handlers";

export const dynamic = "force-dynamic";
export const GET = () => votePage();
export { notFound as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
