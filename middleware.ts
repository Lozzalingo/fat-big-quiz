import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, verifySSOToken } from "./lib/auth-sso";

const SITE_ID = "fat-big-quiz";
const COOKIE_NAME = `lza_user_${SITE_ID}`;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const hasUrlToken = request.nextUrl.searchParams.has('auth_token');

    // 1. Run SSO auth check (handles URL token, cookie, and redirect to login)
    const sso = await requireAuth(request, NextResponse);

    if ("redirect" in sso) {
      // If auth_token was in the URL, always return the response from requireAuth.
      // This is either a 200 meta-refresh (token valid, setting cookie) or a
      // redirect to login (token invalid). In both cases we must return it
      // immediately - a stale site cookie must NOT block the SSO flow.
      if (hasUrlToken) {
        console.log('[Middleware] auth_token in URL, returning requireAuth response directly');
        return sso.redirect;
      }

      // No URL token: requireAuth wants to redirect to login because there's
      // no auth_token cookie. But we should check the site-scoped cookie first
      // before redirecting (local admin flow).
      const siteCookie = request.cookies.get(COOKIE_NAME)?.value;
      if (!siteCookie) {
        console.log('[Middleware] No site cookie, returning SSO redirect to login');
        return sso.redirect;
      }
      // Site cookie exists, fall through to check it below
    }

    // 2. SSO cookie was valid and user is super admin - allow through
    if ("payload" in sso && sso.payload.is_super_admin) {
      console.log('[Middleware] Super admin authenticated via SSO:', sso.payload.email);
      return NextResponse.next();
    }

    // 3. Check site-scoped auth cookie (local admin flow)
    const siteCookie = request.cookies.get(COOKIE_NAME)?.value;
    if (siteCookie) {
      const payload = await verifySSOToken(siteCookie);
      if (payload) {
        // Valid JWT in site cookie - allow through (Express session endpoint
        // provides the role, and the admin layout checks it)
        console.log('[Middleware] Site cookie valid for:', payload.email);
        return NextResponse.next();
      }
      console.warn('[Middleware] Site cookie invalid/expired, clearing');
    }

    // 4. No valid auth - redirect to login
    const host = request.headers.get('host') || request.nextUrl.host;
    const isLocal = ['localhost', '127.0.0.1', '0.0.0.0'].some(h => host.startsWith(h));
    const protocol = isLocal ? 'http' : 'https';
    const redirectTarget = `${protocol}://${host}${pathname}`;
    console.log('[Middleware] No valid auth, redirecting to login for:', redirectTarget);
    return NextResponse.redirect(
      `${process.env.AUTH_SERVICE_URL || "https://auth.laurence.computer"}/login?redirect=${encodeURIComponent(redirectTarget)}`
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
