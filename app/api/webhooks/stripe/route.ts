import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
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

      // Get product name and amount from line items
      const productName = session.line_items?.data?.[0]?.description || "Quiz Pack";
      const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : "0.00";

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
            console.error("Failed to create purchase record");
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
        } catch (error) {
          console.error("Error creating purchase:", error);
        }
      }

      console.log(`Payment completed for session: ${session.id}`);
      break;
    }

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`PaymentIntent succeeded: ${paymentIntent.id}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`Payment failed: ${paymentIntent.id}`);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
