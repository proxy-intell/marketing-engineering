import { setupMd, notFound } from "@/lib/handlers";

export const GET = setupMd;
export { setupMd as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
