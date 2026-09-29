import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { handleSSOAuth, ssoLoginRedirect } from "./lib/auth-sso";

/**
 * Next.js Middleware - Admin route protection.
 *
 * Admin routes accept either:
 * 1. SSO token from auth.laurence.computer (super admin)
 * 2. NextAuth session with admin role (local app auth)
 *
 * If neither is valid, redirects to SSO login.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Check SSO first
    const sso = await handleSSOAuth(request, NextResponse);
    if ("redirect" in sso) return sso.redirect;
    if ("authenticated" in sso && sso.authenticated) return NextResponse.next();

    // Fallback: check NextAuth session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (token && token.role === "admin") return NextResponse.next();

    // Neither auth passed - redirect to SSO login
    return NextResponse.redirect(ssoLoginRedirect(request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
