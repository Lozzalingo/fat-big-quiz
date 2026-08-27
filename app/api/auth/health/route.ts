/**
 * Auth Health Check
 *
 * Verifies NextAuth is configured and responding.
 * Does NOT require a valid session - just checks the auth system is alive.
 *
 * GET /api/auth/health
 */

import { NextResponse } from "next/server";

export async function GET() {
  console.log("[AuthHealth] Running auth health check");

  try {
    // Check that NextAuth providers endpoint responds
    // This is a public endpoint that returns available providers
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${baseUrl}/api/auth/providers`, {
      signal: controller.signal,
      headers: { "User-Agent": "FBQ-AuthHealth/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("[AuthHealth] Providers endpoint returned", res.status);
      return NextResponse.json(
        {
          status: "unhealthy",
          error: `Auth providers returned ${res.status}`,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }

    const providers = await res.json();
    const providerNames = Object.keys(providers);

    // Check critical env vars are set (not their values, just existence)
    const envChecks = {
      NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    };
    const allEnvOk = Object.values(envChecks).every(Boolean);

    if (!allEnvOk) {
      console.error("[AuthHealth] Missing env vars:", envChecks);
    }

    console.log("[AuthHealth] Auth healthy - providers:", providerNames.join(", "));

    return NextResponse.json({
      status: allEnvOk ? "healthy" : "degraded",
      providers: providerNames,
      envConfigured: envChecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[AuthHealth] Auth check failed:", error.message);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error.message || "Auth system unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
