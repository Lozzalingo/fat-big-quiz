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

  let event: any;
  try {
    event = JSON.parse(body);
    console.log("[Payments] Webhook event received:", event.type, event.id);
  } catch (err: any) {
    console.error("[Payments] Failed to parse webhook body:", err.message);
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Handle the event
  switch (event.type) {
    // One-time purchase completed
    case "checkout.session.completed": {
      const session = event.data?.object || event.data;

      // Handle subscription checkout separately
      if (session.mode === "subscription") {
        await handleSubscriptionCheckout(session);
        break;
      }

      // One-time purchase flow
      // Supports both single-product (legacy productId) and multi-item cart (productIds JSON array)
      const metadata = session.metadata || {};
      const customerEmail = session.customer_email || session.customer_details?.email;

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
      if (session.line_items?.data) {
        productNames = session.line_items.data.map((item: any) => item.description || "Quiz Pack");
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
                  stripeSessionId: session.id,
                  stripePaymentId: session.payment_intent,
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
                sessionId: session.id,
                productImages,
              }),
            }
          );
        } catch (error) {
          console.error("[Payments] Error processing purchase:", error);
        }
      } else if (!customerEmail) {
        console.error("[Payments] No customer email found for session:", session.id);
      } else {
        console.error("[Payments] No product IDs found in metadata for session:", session.id);
      }

      console.log(`[Payments] Payment completed for session: ${session.id}`);
      break;
    }

    // Subscription lifecycle events
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data?.object || event.data;
      await updateUserSubscription(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data?.object || event.data;
      await cancelUserSubscription(subscription);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data?.object || event.data;
      const failedSubId = invoice.parent?.subscription_details?.subscription;
      if (failedSubId) {
        console.log(`[Payments] Subscription payment failed for: ${invoice.customer_email}`);
        // The payments service will retry, and eventually cancel. We handle the deletion event above.
      }
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data?.object || event.data;
      console.log(`[Payments] PaymentIntent succeeded: ${paymentIntent.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data?.object || event.data;
      console.log(`[Payments] Payment failed: ${paymentIntent.id}`);
      break;
    }

    default:
      console.log(`[Payments] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Subscription helpers

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
  const userId = session.metadata?.userId;
  const subscriptionId = session.subscription;

  if (!userId || !subscriptionId) {
    console.error("[Payments] Subscription checkout missing userId or subscriptionId");
    return;
  }

  // The payments service should include subscription details in the event.
  // Use period_end from the session if available, otherwise use a sensible default.
  const periodEnd = session.subscription_period_end
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
