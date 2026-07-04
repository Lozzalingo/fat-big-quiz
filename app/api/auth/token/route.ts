import { getToken, encode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/utils/db";

/**
 * GET /api/auth/token
 *
 * Returns a NextAuth JWT for the current session, guaranteed to include
 * the user's role from the database. Admin pages fetch this to send as
 * x-admin-key header to the Express API for admin auth.
 */
export async function GET(req: NextRequest) {
  // Decode the session token (runs jwt callback)
  const decoded = await getToken({ req });
  if (!decoded) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Ensure role is present - look up from DB if missing
  if (!decoded.role && decoded.email) {
    console.log("[AuthToken] Role missing from JWT, fetching from DB for:", decoded.email);
    const dbUser = await prisma.user.findFirst({
      where: { email: (decoded.email as string).toLowerCase() },
    });
    if (dbUser) {
      decoded.role = (dbUser as any).role || "user";
      console.log("[AuthToken] Role from DB:", decoded.role);
    }
  }

  // Re-encode the token with the role included
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("[AuthToken] NEXTAUTH_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const rawToken = await encode({
    token: decoded,
    secret,
  });

  console.log("[AuthToken] Token issued for:", decoded.email, "role:", decoded.role);
  return NextResponse.json({ token: rawToken });
}
