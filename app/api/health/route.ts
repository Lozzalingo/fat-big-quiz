/**
 * Critical Page Health Check API
 *
 * Tests key frontend pages and API endpoints server-side.
 * Returns a structured report so monitoring can detect outages.
 *
 * GET /api/health - public health check (basic)
 * GET /api/health?detailed=true - detailed check with page tests (slower)
 */

import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

interface CheckResult {
  name: string;
  url: string;
  status: number | "ERROR";
  ok: boolean;
  responseTimeMs: number;
  error?: string;
}

async function checkEndpoint(name: string, url: string, timeoutMs = 10000): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FBQ-HealthCheck/1.0" },
    });
    clearTimeout(timeout);

    return {
      name,
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      responseTimeMs: Date.now() - start,
    };
  } catch (error: any) {
    return {
      name,
      url,
      status: "ERROR",
      ok: false,
      responseTimeMs: Date.now() - start,
      error: error.message || "Unknown error",
    };
  }
}

export async function GET(request: Request) {
  console.log("[HealthCheck] Running health check");

  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get("detailed") === "true";

  // Always check these critical API endpoints
  const checks: Promise<CheckResult>[] = [
    checkEndpoint("API Health", `${API_BASE}/api/health`),
    checkEndpoint("Products API", `${API_BASE}/api/products`),
    checkEndpoint("Blog API", `${API_BASE}/api/blog`),
  ];

  // Detailed mode also tests actual frontend pages (slower, hits SSR)
  if (detailed) {
    checks.push(
      checkEndpoint("Homepage", `${SITE_BASE}/`),
      checkEndpoint("Shop Page", `${SITE_BASE}/shop`),
      checkEndpoint("Blog Page", `${SITE_BASE}/blog`),
      // Test a known product slug - this caught the last outage
      checkEndpoint("Product Detail (Christmas Quiz)", `${SITE_BASE}/quiz-pack/christmas-quiz`),
    );
  }

  const results = await Promise.all(checks);

  const allOk = results.every((r) => r.ok);
  const failedChecks = results.filter((r) => !r.ok);

  const response = {
    status: allOk ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    checksRun: results.length,
    checksPassed: results.filter((r) => r.ok).length,
    checksFailed: failedChecks.length,
    results,
    ...(failedChecks.length > 0 && {
      failures: failedChecks.map((f) => `${f.name}: ${f.status} ${f.error || ""}`),
    }),
  };

  if (!allOk) {
    console.error("[HealthCheck] UNHEALTHY -", failedChecks.map((f) => f.name).join(", "));
  } else {
    console.log("[HealthCheck] All checks passed");
  }

  return NextResponse.json(response, { status: allOk ? 200 : 503 });
}
