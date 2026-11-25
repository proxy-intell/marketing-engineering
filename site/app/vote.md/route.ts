import { voteMd, notFound } from "@/lib/handlers";

export const GET = voteMd;
export { voteMd as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
