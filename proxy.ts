import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, expectedToken, isValid } from "@/lib/session";

const PUBLIC_PATHS = [
  "/login",
  "/api/login",
  "/api/logout",
  "/api/mcp",
  "/api/health",
  "/api/strava",
  "/api/intervals",
  "/api/garmin/wellness",
  "/auth/strava/callback",
  "/favicon.ico",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ) {
    return NextResponse.next();
  }

  // No password configured → fail closed in production, allow in dev to avoid lockout
  if (!expectedToken()) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("DASHBOARD_PASSWORD not configured", { status: 500 });
    }
    return NextResponse.next();
  }

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (isValid(cookie)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next internals
     * - static assets in public/
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
