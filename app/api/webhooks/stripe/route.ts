import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Lazy initialization to avoid build-time errors
let stripe: Stripe;
function getStripe() {
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-12-18.acacia",
    });
  }
  return stripe;
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET!;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.log("[Stripe] Webhook rejected — missing signature header");
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
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Extract metadata (including userId for logged-in users)
      const { productId, productType, slug, userId } = session.metadata || {};
      const customerEmail = session.customer_email || session.customer_details?.email;

      // Get product name from line items (must be fetched separately)
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
        // Create purchase record in database
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productId,
                email: customerEmail,
                userId: userId || null, // Link to user account if logged in
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
            // Send purchase confirmation with download link
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
            // Send order confirmation for events/physical products
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
