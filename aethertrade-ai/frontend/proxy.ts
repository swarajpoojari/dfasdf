import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js request proxy (formerly "middleware"). Redirects page requests without a session hint to
 * /login. This is a routing convenience only — the backend authenticates every API request, and the
 * hint cookie grants nothing by itself.
 */

const SESSION_HINT_COOKIE = "aether_session";
const PUBLIC_PATHS = ["/login"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (request.cookies.has(SESSION_HINT_COOKIE)) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API calls (proxied to the backend), Next internals and static files.
  matcher: ["/((?!api/|_next/|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
