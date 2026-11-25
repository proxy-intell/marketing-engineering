import { NextResponse, type NextRequest } from "next/server";

// marketingengineering.dev is canonical. Anything else (www, other TLDs) redirects to it.
// localhost for dev, *.run.app so the Cloud Run service URL works before and after cutover.
// Reads the Host header: the standalone server builds nextUrl from its own bind address, not the request's host.
export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? request.nextUrl.host).replace(/:\d+$/, "");
  if (["marketingengineering.dev", "localhost"].includes(hostname) || hostname.endsWith(".run.app")) return NextResponse.next();
  // Next re-serializes the query before the proxy sees it (":" -> "%3A", "%20" -> "+"). Same values, different bytes.
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(`https://marketingengineering.dev${pathname}${search}`, 301);
}
