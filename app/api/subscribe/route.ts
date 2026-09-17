import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const PAYMENTS_URL = process.env.PAYMENTS_SERVICE_URL || 'https://payments.laurence.computer';
const PAYMENTS_KEY = process.env.PAYMENTS_API_KEY || '';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Require login
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log("[Payments] Subscribe rejected - not logged in");
      return NextResponse.json(
        { error: "You must be logged in to subscribe" },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const userId = (session.user as any).id;

    console.log("[Payments] Subscription request for:", email);

    // Find user and check if already subscribed
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if ((user as any)?.subscriptionStatus === "active") {
      console.log("[Payments] User already has active subscription");
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Call the centralised payments service for subscription checkout
    const response = await fetch(`${PAYMENTS_URL}/api/payments/checkout/subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Pay-Key': PAYMENTS_KEY,
      },
      body: JSON.stringify({
        customer_email: email,
        customer_id: user?.stripeCustomerId || undefined,
        user_id: userId,
        product_name: 'Quiz Database Access',
        product_description: 'Full access to the Fat Big Quiz question database with 59,000+ questions, quiz builder, lucky dip, and export tools.',
        product_metadata: { type: 'quiz-database-subscription' },
        unit_amount: 999,
        currency: 'gbp',
        interval: 'month',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quiz-database?subscribed=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quiz-database?cancelled=true`,
        metadata: { userId },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Payments] Subscription service error:", response.status, errData);
      throw new Error(errData.error || `Payments service returned ${response.status}`);
    }

    const data = await response.json();

    // If the payments service created a new Stripe customer, store the ID
    if (data.customer_id && !user?.stripeCustomerId) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: data.customer_id },
      });
      console.log("[Payments] Stored customer ID from payments service:", data.customer_id);
    }

    console.log("[Payments] Subscription checkout session created:", data.session_id || data.sessionId);
    return NextResponse.json({ url: data.checkout_url || data.url });
  } catch (error: any) {
    console.error("[Payments] Subscribe error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating subscription" },
      { status: 500 }
    );
  }
}
