import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, verifySSOToken, buildExternalUrl } from "./lib/auth-sso";

const SITE_ID = "fat-big-quiz";
const COOKIE_NAME = `lza_user_${SITE_ID}`;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // 1. Check SSO token from auth.laurence.computer (super admin flow)
    const sso = await requireAuth(request, NextResponse);
    if ("redirect" in sso) {
      // SSO handled it (either redirect to login or set cookie redirect)
      // But only redirect if there is no local site cookie to check
      const siteCookie = request.cookies.get(COOKIE_NAME)?.value;
      if (!siteCookie) return sso.redirect;
    }
    if ("payload" in sso && sso.payload.is_super_admin) return NextResponse.next();

    // 2. Check site-scoped auth cookie (local admin flow)
    const siteCookie = request.cookies.get(COOKIE_NAME)?.value;
    if (siteCookie) {
      const payload = await verifySSOToken(siteCookie);
      if (payload) {
        // Valid JWT in site cookie - check if user has admin role by
        // allowing the request through (Express session endpoint
        // provides the role, and the admin layout checks it)
        return NextResponse.next();
      }
    }

    // 3. No valid auth - redirect to login
    // Use buildExternalUrl to get the correct external URL (fixes host/port/protocol
    // when running behind Nginx/Cloudflare in Docker)
    const extUrl = new URL(buildExternalUrl(request));
    extUrl.searchParams.delete('auth_token');
    const redirectTarget = extUrl.toString();
    return NextResponse.redirect(
      `${process.env.AUTH_SERVICE_URL || "https://auth.laurence.computer"}/login?redirect=${encodeURIComponent(redirectTarget)}`
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
