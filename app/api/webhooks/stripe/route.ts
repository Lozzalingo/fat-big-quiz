import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

// Lazy initialization to avoid build-time errors
let stripe: Stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return stripe;
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.log("[Stripe] Webhook rejected - missing signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, getWebhookSecret());
    console.log("[Stripe] Webhook event received:", event.type, event.id);
  } catch (err: any) {
    console.error("[Stripe] Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    // ─── One-time purchase completed ─────────────────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle subscription checkout separately
      if (session.mode === "subscription") {
        await handleSubscriptionCheckout(session);
        break;
      }

      // One-time purchase flow (existing logic)
      const { productId, productType, slug, userId } = session.metadata || {};
      const customerEmail = session.customer_email || session.customer_details?.email;

      let productName = "Quiz Pack";
      try {
        const lineItems = await getStripe().checkout.sessions.listLineItems(session.id, { limit: 1 });
        if (lineItems.data?.[0]?.description) {
          productName = lineItems.data[0].description;
        }
        console.log("[Stripe] Product name resolved:", productName);
      } catch (err: any) {
        console.error("[Stripe] Failed to fetch line items:", err.message);
      }
      const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00";

      console.log("[Stripe] Checkout completed:", { productId, productType, email: customerEmail, amount: amountTotal });

      if (productId && customerEmail) {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId,
                email: customerEmail,
                userId: userId || null,
                stripeSessionId: session.id,
                stripePaymentId: session.payment_intent,
                status: "completed",
              }),
            }
          );

          if (!response.ok) {
            console.error("[Stripe] Failed to create purchase record:", response.status);
          } else {
            console.log("[Stripe] Purchase record created for:", customerEmail);
          }

          // Send confirmation email
          if (productType === "DIGITAL_DOWNLOAD") {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/send-purchase-email`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: customerEmail,
                  productName,
                  price: amountTotal,
                  sessionId: session.id,
                }),
              }
            );
          } else {
            await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/send-order-email`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: customerEmail,
                  productName,
                  price: amountTotal,
                  orderType: productType,
                }),
              }
            );
          }

          // Send admin notification
          await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/send-admin-notification`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerEmail,
                productName,
                price: amountTotal,
                productType,
                sessionId: session.id,
              }),
            }
          );
        } catch (error) {
          console.error("[Stripe] Error processing purchase:", error);
        }
      }

      console.log(`[Stripe] Payment completed for session: ${session.id}`);
      break;
    }

    // ─── Subscription lifecycle events ───────────────────────────────
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateUserSubscription(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await cancelUserSubscription(subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const failedSubId = invoice.parent?.subscription_details?.subscription;
      if (failedSubId) {
        console.log(`[Stripe] Subscription payment failed for: ${invoice.customer_email}`);
        // Stripe will retry, and eventually cancel. We handle the deletion event above.
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] PaymentIntent succeeded: ${paymentIntent.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`[Stripe] Payment failed: ${paymentIntent.id}`);
      break;
    }

    default:
      console.log(`[Stripe] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// ─── Subscription helpers ─────────────────────────────────────────────────

/**
 * Extract the current_period_end from a subscription.
 * In Stripe API v2026-02-25 (clover), this moved from subscription-level to item-level.
 */
function getPeriodEnd(subscription: Stripe.Subscription): number {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (itemEnd) return itemEnd;
  // Fallback: use cancel_at or billing_cycle_anchor + 30 days
  return subscription.cancel_at || (subscription.billing_cycle_anchor + 30 * 24 * 60 * 60);
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.error("[Stripe] Subscription checkout missing userId or subscriptionId");
    return;
  }

  // Fetch the subscription to get period details
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const periodEnd = getPeriodEnd(subscription);

  await (prisma.user as any).update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Stripe] Subscription activated for user ${userId}, expires: ${new Date(periodEnd * 1000).toISOString()}`);
}

async function updateUserSubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Stripe] No user found for Stripe customer: ${customerId}`);
    return;
  }

  const status = subscription.status === "active" || subscription.status === "trialing"
    ? "active"
    : subscription.status;

  const periodEnd = getPeriodEnd(subscription);

  await (prisma.user as any).update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Stripe] Subscription updated for ${user.email}: ${status}, expires: ${new Date(periodEnd * 1000).toISOString()}`);
}

async function cancelUserSubscription(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Stripe] No user found for Stripe customer: ${customerId}`);
    return;
  }

  const periodEnd = getPeriodEnd(subscription);

  await (prisma.user as any).update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "cancelled",
      // Keep expiresAt so they have access until end of billing period
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Stripe] Subscription cancelled for ${user.email}, access until: ${new Date(periodEnd * 1000).toISOString()}`);
}
