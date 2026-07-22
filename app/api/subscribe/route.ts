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

export async function POST(request: NextRequest) {
  try {
    // Require login
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log("[Stripe] Subscribe rejected - not logged in");
      return NextResponse.json(
        { error: "You must be logged in to subscribe" },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const userId = (session.user as any).id;

    console.log("[Stripe] Subscription request for:", email);

    // Find or create Stripe customer
    const user = await prisma.user.findUnique({ where: { id: userId } });
    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
      console.log("[Stripe] Created Stripe customer:", customerId);
    }

    // Check if already subscribed
    if ((user as any)?.subscriptionStatus === "active") {
      console.log("[Stripe] User already has active subscription");
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Find or create the price (£9.99/month)
    const priceId = await getOrCreatePrice();

    // Create subscription checkout session
    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quiz-database?subscribed=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/quiz-database?cancelled=true`,
      metadata: { userId },
    });

    console.log("[Stripe] Subscription checkout session created:", checkoutSession.id);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("[Stripe] Subscribe error:", error.message);
    return NextResponse.json(
      { error: error.message || "Error creating subscription" },
      { status: 500 }
    );
  }
}

/**
 * Find or create the Quiz Database monthly price in Stripe.
 * Caches the price ID to avoid creating duplicates.
 */
async function getOrCreatePrice(): Promise<string> {
  // Check for existing product by metadata
  const products = await getStripe().products.search({
    query: 'metadata["type"]:"quiz-database-subscription"',
  });

  if (products.data.length > 0) {
    const product = products.data[0];
    const prices = await getStripe().prices.list({
      product: product.id,
      active: true,
      limit: 1,
    });
    if (prices.data.length > 0) {
      return prices.data[0].id;
    }
  }

  // Create product and price
  const product = await getStripe().products.create({
    name: "Quiz Database Access",
    description: "Full access to the Fat Big Quiz question database with 59,000+ questions, quiz builder, lucky dip, and export tools.",
    metadata: { type: "quiz-database-subscription" },
  });

  const price = await getStripe().prices.create({
    product: product.id,
    unit_amount: 999, // £9.99
    currency: "gbp",
    recurring: { interval: "month" },
  });

  console.log("[Stripe] Created subscription product and price:", product.id, price.id);
  return price.id;
}
