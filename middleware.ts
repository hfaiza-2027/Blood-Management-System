import { NextResponse, type NextRequest } from "next/server";

const LIVE = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

/**
 * Fast gate for private areas: without a session cookie, go straight to login
 * (keeping where the person was headed). Layouts still verify the session.
 */
export function middleware(req: NextRequest) {
  if (!LIVE) return NextResponse.next();
  const hasSession = Boolean(req.cookies.get("qatra_session")?.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
