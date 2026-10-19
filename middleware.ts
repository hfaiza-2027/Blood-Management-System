import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "bloodbridge_session";

/**
 * Fast gate for private areas: without a session cookie, go straight to login
 * (keeping where the person was headed). Layouts still verify the session and
 * the role on the server.
 */
export function middleware(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
