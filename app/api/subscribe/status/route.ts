import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/subscribe/status - check current user's subscription status
 * Returns: { hasAccess, status, expiresAt }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({
        hasAccess: false,
        status: "none",
        loggedIn: false,
      });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    // Admins always have access
    if (role === "admin") {
      return NextResponse.json({
        hasAccess: true,
        status: "admin",
        loggedIn: true,
      });
    }

    const user = await (prisma.user as any).findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
      },
    }) as { subscriptionStatus: string | null; subscriptionExpiresAt: Date | null } | null;

    // Check if subscription is active and not expired
    const isActive = user?.subscriptionStatus === "active";
    const notExpired = !user?.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date();
    const hasAccess = isActive && notExpired;

    return NextResponse.json({
      hasAccess,
      status: user?.subscriptionStatus || "none",
      expiresAt: user?.subscriptionExpiresAt,
      loggedIn: true,
    });
  } catch (error: any) {
    console.error("[Subscribe] Status check error:", error.message);
    return NextResponse.json(
      { hasAccess: false, status: "error", loggedIn: false },
      { status: 500 }
    );
  }
}
