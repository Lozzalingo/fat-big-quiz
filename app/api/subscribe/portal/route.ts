import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

let stripe: Stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripe;
}

const prisma = new PrismaClient();

/**
 * POST /api/subscribe/portal - redirect user to Stripe Customer Portal
 * to manage their subscription (cancel, update payment method, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user?.stripeCustomerId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 400 });
    }

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quiz-database`,
    });

    console.log("[Stripe] Portal session created for:", session.user.email);
    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error("[Stripe] Portal error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating portal session" },
      { status: 500 }
    );
  }
}
