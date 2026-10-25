/**
 * Server-side auth helpers for Next.js API routes.
 *
 * Replaces getServerSession(authOptions) from NextAuth.
 * Reads the lza_user_fat-big-quiz cookie and verifies the JWT
 * using the shared AUTH_JWT_SECRET.
 *
 * These routes should eventually move to Express. This bridge
 * lets us remove NextAuth now while keeping them working.
 */

import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "lza_user_fat-big-quiz";

interface AuthPayload {
  user_id?: number;
  email?: string;
  site_id?: string;
  is_super_admin?: boolean;
  site_access?: Array<{ site_id: string; role: string }>;
  iat?: number;
  exp?: number;
}

interface SessionUser {
  id: string;
  email: string;
  role: string;
}

function base64urlDecode(str: string): Buffer {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function verifyHS256(token: string, secret: string): { valid: boolean; payload: AuthPayload | null } {
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, payload: null };

  try {
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(base64urlDecode(headerB64).toString("utf8"));
    if (header.alg !== "HS256") return { valid: false, payload: null };

    // Compute expected signature
    const signingInput = `${headerB64}.${payloadB64}`;

    // Detect hex-encoded secret
    const secretBuffer =
      Buffer.from(secret, "hex").length === secret.length / 2 && /^[0-9a-f]+$/i.test(secret)
        ? Buffer.from(secret, "hex")
        : Buffer.from(secret, "utf8");

    const expectedSig = crypto
      .createHmac("sha256", secretBuffer)
      .update(signingInput)
      .digest("base64url");

    // Timing-safe comparison
    const sigBuf = Buffer.from(signatureB64, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");

    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { valid: false, payload: null };
    }

    const payload: AuthPayload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));

    // Check expiry (30s tolerance)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp + 30) {
      return { valid: false, payload: null };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, payload: null };
  }
}

/**
 * Get the authenticated user from the auth cookie.
 * Returns null if not authenticated.
 *
 * Usage in Next.js API routes:
 *   const user = await getSessionUser();
 *   if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    console.error("[ServerAuth] AUTH_JWT_SECRET not configured");
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const { valid, payload } = verifyHS256(token, secret);
  if (!valid || !payload?.email) {
    return null;
  }

  // Import Prisma dynamically to avoid bundling issues
  const { default: prisma } = await import("@/utils/db");

  const localUser = await prisma.user.findFirst({
    where: { email: payload.email.toLowerCase().trim() },
    select: { id: true, email: true, role: true },
  });

  if (!localUser) {
    return null;
  }

  return {
    id: localUser.id,
    email: localUser.email,
    role: (localUser as any).role || "user",
  };
}
