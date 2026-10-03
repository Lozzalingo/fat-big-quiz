import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "crypto";

const WEBHOOK_SECRET = process.env.PAYMENTS_WEBHOOK_SECRET || '';

const prisma = new PrismaClient();

/**
 * Verify the X-Pay-Signature HMAC header from the payments service.
 * The signature is an HMAC-SHA256 hex digest of the raw request body,
 * keyed with PAYMENTS_WEBHOOK_SECRET.
 */
function verifySignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("[Payments] No PAYMENTS_WEBHOOK_SECRET configured");
    return false;
  }
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  return signature === expected;
}

/**
 * Normalise a payments service callback into a consistent format.
 *
 * The payments service sends flat payloads like:
 *   { event_type: "checkout.session.completed", session_id: "cs_...", customer_email: "...", metadata: {...} }
 *
 * We normalise this to:
 *   { type: "checkout.session.completed", data: { ...flat fields } }
 */
function normaliseEvent(raw: any): { type: string; data: any } {
  // If it already has a `type` field (Stripe-native format), use as-is
  if (raw.type && raw.data) {
    return { type: raw.type, data: raw.data.object || raw.data };
  }

  // Payments service flat callback format uses `event_type`
  const type = raw.event_type || raw.type || 'unknown';
  // Everything except event_type is the data
  const { event_type: _et, ...data } = raw;
  return { type, data };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-pay-signature");

  if (!signature) {
    console.log("[Payments] Webhook rejected - missing X-Pay-Signature header");
    return NextResponse.json(
      { error: "Missing X-Pay-Signature header" },
      { status: 400 }
    );
  }

  if (!verifySignature(body, signature)) {
    console.error("[Payments] Webhook signature verification failed");
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  let raw: any;
  try {
    raw = JSON.parse(body);
  } catch (err: any) {
    console.error("[Payments] Failed to parse webhook body:", err.message);
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { type: eventType, data: eventData } = normaliseEvent(raw);
  console.log("[Payments] Webhook callback received:", eventType);

  // Handle the event
  switch (eventType) {
    // One-time purchase completed
    case "checkout.session.completed": {
      // The payments service sends flat fields: session_id, payment_intent_id,
      // customer_email, amount_total, metadata, line_items, mode, etc.
      const session = eventData;

      // Handle subscription checkout separately
      if (session.mode === "subscription") {
        await handleSubscriptionCheckout(session);
        break;
      }

      // One-time purchase flow
      const metadata = session.metadata || {};
      const customerEmail = session.customer_email || session.customer_details?.email;

      // The payments service sends session_id (not id)
      const sessionId = session.session_id || session.id;
      const paymentIntentId = session.payment_intent_id || session.payment_intent;

      // Resolve all product IDs from metadata
      let allProductIds: string[] = [];
      if (metadata.productIds) {
        try {
          allProductIds = JSON.parse(metadata.productIds);
        } catch {
          console.error("[Payments] Failed to parse productIds metadata");
        }
      }
      // Legacy single-product fallback
      if (allProductIds.length === 0 && metadata.productId) {
        allProductIds = [metadata.productId];
      }

      const productType = metadata.productType;
      const userId = metadata.userId;

      // Get product names from the event data (the payments service includes line items)
      let productNames: string[] = [];
      if (session.line_items) {
        const items = Array.isArray(session.line_items) ? session.line_items : session.line_items?.data || [];
        productNames = items.map((item: any) => item.description || "Quiz Pack");
      }
      const productName = productNames.length > 0 ? productNames.join(", ") : "Quiz Pack";
      const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00";

      console.log("[Payments] Checkout completed:", { productIds: allProductIds, productType, email: customerEmail, amount: amountTotal });

      if (allProductIds.length > 0 && customerEmail) {
        try {
          // Create a purchase record for each product
          for (const pid of allProductIds) {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  productId: pid,
                  email: customerEmail,
                  userId: userId || null,
                  stripeSessionId: sessionId,
                  stripePaymentId: paymentIntentId,
                  status: "completed",
                }),
              }
            );

            if (!response.ok) {
              console.error("[Payments] Failed to create purchase record for product:", pid, response.status);
            } else {
              console.log("[Payments] Purchase record created for:", customerEmail, "product:", pid);
            }
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
                  sessionId,
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

          // Collect product images for admin email
          let productImages: string[] = [];
          try {
            const dbProducts = await (prisma as any).product.findMany({
              where: { id: { in: allProductIds } },
              select: { mainImage: true },
            });
            productImages = dbProducts
              .map((p: any) => p.mainImage)
              .filter(Boolean) as string[];
          } catch (imgErr: any) {
            console.error("[Payments] Failed to fetch product images for admin email:", imgErr.message);
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
                sessionId,
                productImages,
              }),
            }
          );
        } catch (error) {
          console.error("[Payments] Error processing purchase:", error);
        }
      } else if (!customerEmail) {
        console.error("[Payments] No customer email found for session:", sessionId);
      } else {
        console.error("[Payments] No product IDs found in metadata for session:", sessionId);
      }

      console.log(`[Payments] Payment completed for session: ${sessionId}`);
      break;
    }

    // Subscription lifecycle events
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      // Payments service sends: subscription_id, customer_id, status,
      // current_period_start, current_period_end, cancel_at_period_end, items, metadata
      const subscription = normaliseSubscriptionData(eventData);
      await updateUserSubscription(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = normaliseSubscriptionData(eventData);
      await cancelUserSubscription(subscription);
      break;
    }

    case "invoice.payment_failed": {
      const customerEmail = eventData.customer_email;
      const subId = eventData.subscription_id;
      if (subId) {
        console.log(`[Payments] Subscription payment failed for: ${customerEmail}`);
        // The payments service will retry, and eventually cancel. We handle the deletion event above.
      }
      break;
    }

    case "payment_intent.succeeded": {
      const intentId = eventData.payment_intent_id || eventData.id;
      console.log(`[Payments] PaymentIntent succeeded: ${intentId}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const intentId = eventData.payment_intent_id || eventData.id;
      console.log(`[Payments] Payment failed: ${intentId}`);
      break;
    }

    default:
      console.log(`[Payments] Unhandled event type: ${eventType}`);
  }

  return NextResponse.json({ received: true });
}

// Subscription helpers

/**
 * Normalise the payments service's flat subscription callback into the format
 * our handlers expect (matching Stripe subscription object shape).
 */
function normaliseSubscriptionData(data: any): any {
  return {
    id: data.subscription_id || data.id,
    customer: data.customer_id || data.customer,
    status: data.status,
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end,
    items: data.items ? { data: data.items } : undefined,
    metadata: data.metadata || {},
  };
}

/**
 * Extract the current_period_end from a subscription.
 * Supports both the subscription-level field and the item-level field
 * (which moved in newer Stripe API versions).
 */
function getPeriodEnd(subscription: any): number {
  // Item-level (newer API)
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (itemEnd) return itemEnd;
  // Subscription-level (older API / payments service normalised)
  if (subscription.current_period_end) return subscription.current_period_end;
  // Fallback: use cancel_at or billing_cycle_anchor + 30 days
  return subscription.cancel_at || (subscription.billing_cycle_anchor + 30 * 24 * 60 * 60);
}

async function handleSubscriptionCheckout(session: any) {
  const metadata = session.metadata || {};
  const userId = metadata.userId;
  const subscriptionId = session.subscription_id || session.subscription;

  if (!userId || !subscriptionId) {
    console.error("[Payments] Subscription checkout missing userId or subscriptionId");
    return;
  }

  // Store the customer ID if provided
  const customerId = session.customer_id || session.customer;
  if (customerId) {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (existingUser && !existingUser.stripeCustomerId) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
      console.log("[Payments] Stored customer ID from subscription checkout:", customerId);
    }
  }

  // Use period_end from the session if available, otherwise use a sensible default.
  const periodEnd = session.current_period_end
    || session.subscription_period_end
    || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  await (prisma.user as any).update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: "active",
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Payments] Subscription activated for user ${userId}, expires: ${new Date(periodEnd * 1000).toISOString()}`);
}

async function updateUserSubscription(subscription: any) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Payments] No user found for customer: ${customerId}`);
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

  console.log(`[Payments] Subscription updated for ${user.email}: ${status}, expires: ${new Date(periodEnd * 1000).toISOString()}`);
}

async function cancelUserSubscription(subscription: any) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Payments] No user found for customer: ${customerId}`);
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

  console.log(`[Payments] Subscription cancelled for ${user.email}, access until: ${new Date(periodEnd * 1000).toISOString()}`);
}
