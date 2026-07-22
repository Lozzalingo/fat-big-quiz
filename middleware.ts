import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js Middleware - Server-side route protection
 * Ensures admin routes cannot be accessed without a valid session.
 * This runs BEFORE the page renders, preventing unauthenticated users
 * from seeing admin UI or making admin API calls.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // No session - redirect to login
    if (!token) {
      console.log("[Middleware] Unauthenticated access to admin route:", pathname);
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check admin role
    if (token.role !== "admin") {
      console.log("[Middleware] Non-admin user attempted admin access:", token.email, pathname);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
