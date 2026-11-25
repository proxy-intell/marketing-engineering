// Everything else: the worker's JSON 404, not Next's HTML one.
import { notFound } from "@/lib/handlers";

export { notFound as GET, notFound as HEAD, notFound as POST, notFound as PUT, notFound as PATCH, notFound as DELETE, notFound as OPTIONS };
