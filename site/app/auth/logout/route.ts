import { authLogout, notFound } from "@/lib/handlers";

// POST only: a GET sign-out could be triggered by any page with an <img>.
export const POST = (request: Request) => authLogout(request);
export { notFound as GET, notFound as HEAD, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
