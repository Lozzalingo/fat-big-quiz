import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/token
 *
 * Returns the raw NextAuth JWT for the current session.
 * Admin pages fetch this to send as x-admin-key header
 * to the Express API for admin auth.
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, raw: true });
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ token });
}
