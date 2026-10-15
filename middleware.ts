import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { requireAuth, cleanRedirectUrl } from "./lib/auth-sso";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const sso = await requireAuth(request, NextResponse);
    if ("redirect" in sso) return sso.redirect;
    if (sso.payload.is_super_admin) return NextResponse.next();

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (token && token.role === "admin") return NextResponse.next();

    // Use cleanRedirectUrl to avoid leaking internal hosts (0.0.0.0, localhost)
    const redirectTarget = cleanRedirectUrl(request.url);
    return NextResponse.redirect(
      `${process.env.AUTH_SERVICE_URL || "https://auth.laurence.computer"}/login?redirect=${encodeURIComponent(redirectTarget)}`
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
