import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * On-demand revalidation endpoint.
 *
 * Usage:
 *   POST /api/revalidate
 *   Body: { "path": "/blog/some-slug", "secret": "<REVALIDATE_SECRET>" }
 *
 *   Or revalidate everything:
 *   Body: { "path": "/", "secret": "<REVALIDATE_SECRET>" }
 *
 * Protected by REVALIDATE_SECRET env var.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { path, secret } = body;

    const expectedSecret = process.env.REVALIDATE_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      console.error("[Revalidate] Invalid or missing secret");
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    revalidatePath(path, "page");
    console.log("[Revalidate] Revalidated path:", path);

    return NextResponse.json({ revalidated: true, path });
  } catch (error) {
    console.error("[Revalidate] Error:", error);
    return NextResponse.json({ error: "Failed to revalidate" }, { status: 500 });
  }
}
