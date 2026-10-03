import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * POST /api/payments/callback
 *
 * Plain server-to-server callback from the Payments service.
 * No auth header - IP-level trust (service-to-service).
 *
 * Payload:
 * {
 *   event_type: 'checkout.session.completed',
 *   session_id: 'cs_...',
 *   payment_intent_id: 'pi_...',
 *   customer_email: '...',
 *   amount_total: 2500,        // in pence
 *   currency: 'gbp',
 *   metadata: { productIds, productType, userId, ... },
 *   line_items: [...],
 *   shipping: { name, address: { line1, line2, city, state, postal_code, country } }
 * }
 */
export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
  } catch (err: any) {
    console.error("[Payments Callback] Failed to parse request body:", err.message);
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = body.event_type;
  console.log("[Payments Callback] Received event:", eventType);

  if (!eventType) {
    console.error("[Payments Callback] Missing event_type in payload");
    return NextResponse.json({ error: "Missing event_type" }, { status: 400 });
  }

  switch (eventType) {
    case "checkout.session.completed": {
      await handleCheckoutCompleted(body);
      break;
    }

    default:
      console.log(`[Payments Callback] Unhandled event type: ${eventType}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(payload: any) {
  const {
    session_id: sessionId,
    payment_intent_id: paymentIntentId,
    customer_email: customerEmail,
    amount_total: amountTotalPence,
    metadata = {},
    line_items: lineItems = [],
    shipping,
  } = payload;

  if (!customerEmail) {
    console.error("[Payments Callback] No customer_email in payload, session:", sessionId);
    return;
  }

  const amountTotal = amountTotalPence ? (amountTotalPence / 100).toFixed(2) : "0.00";

  // Resolve product IDs from metadata
  let allProductIds: string[] = [];
  if (metadata.productIds) {
    try {
      allProductIds = JSON.parse(metadata.productIds);
    } catch {
      console.error("[Payments Callback] Failed to parse productIds metadata");
    }
  }
  // Legacy single-product fallback
  if (allProductIds.length === 0 && metadata.productId) {
    allProductIds = [metadata.productId];
  }

  const productType: string = metadata.productType || "";
  const userId: string | null = metadata.userId || null;

  // Build product name from line items
  const productNames: string[] = lineItems.map(
    (item: any) => item.description || item.name || "Quiz Pack"
  );
  const productName = productNames.length > 0 ? productNames.join(", ") : "Quiz Pack";

  console.log("[Payments Callback] Checkout completed:", {
    sessionId,
    productIds: allProductIds,
    productType,
    email: customerEmail,
    amount: amountTotal,
  });

  if (allProductIds.length === 0) {
    console.error("[Payments Callback] No product IDs found in metadata for session:", sessionId);
    return;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  try {
    // Create a purchase record for each product
    for (const pid of allProductIds) {
      const response = await fetch(`${apiBase}/api/purchases`, {
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
      });

      if (!response.ok) {
        console.error(
          "[Payments Callback] Failed to create purchase record for product:",
          pid,
          response.status
        );
      } else {
        console.log("[Payments Callback] Purchase record created:", {
          email: customerEmail,
          productId: pid,
        });
      }
    }

    // Record a sale if shipping is present (physical order)
    if (shipping?.address) {
      await recordSale({ payload, productName, amountTotalPence, customerEmail, sessionId });
    }

    // Send confirmation email
    if (productType === "DIGITAL_DOWNLOAD") {
      await fetch(`${apiBase}/api/send-purchase-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          productName,
          price: amountTotal,
          sessionId,
        }),
      });
    } else {
      await fetch(`${apiBase}/api/send-order-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          productName,
          price: amountTotal,
          orderType: productType,
        }),
      });
    }

    // Fetch product images for admin notification
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
      console.error("[Payments Callback] Failed to fetch product images:", imgErr.message);
    }

    // Send admin notification
    await fetch(`${apiBase}/api/send-admin-notification`, {
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
    });

    console.log(`[Payments Callback] Checkout fully processed for session: ${sessionId}`);
  } catch (error) {
    console.error("[Payments Callback] Error processing checkout:", error);
  }
}

/**
 * Record a website Sale in the database for physical orders.
 * Maps the payments callback payload to the Sale/SaleItem schema.
 */
async function recordSale(params: {
  payload: any;
  productName: string;
  amountTotalPence: number;
  customerEmail: string;
  sessionId: string;
}) {
  const { payload, productName, amountTotalPence, customerEmail, sessionId } = params;
  const { shipping, line_items: lineItems = [], metadata = {} } = payload;
  const addr = shipping?.address || {};

  try {
    await (prisma as any).sale.create({
      data: {
        channel: "WEBSITE",
        externalReceiptId: sessionId,
        buyerEmail: customerEmail,
        buyerName: shipping?.name || null,
        grandTotal: amountTotalPence,
        shippingLine1: addr.line1 || null,
        shippingLine2: addr.line2 || null,
        shippingCity: addr.city || null,
        shippingState: addr.state || null,
        shippingPostalCode: addr.postal_code || null,
        shippingCountry: addr.country || null,
        status: "PAID",
        paidAt: new Date(),
        items: {
          create: lineItems.map((item: any) => ({
            title: item.description || item.name || productName,
            quantity: item.quantity || 1,
            unitPrice: item.amount_total || item.price?.unit_amount || 0,
          })),
        },
      },
    });
    console.log("[Payments Callback] Sale record created for session:", sessionId);
  } catch (saleErr: any) {
    // Non-fatal - purchase records are the source of truth for fulfilment
    console.error("[Payments Callback] Failed to create sale record:", saleErr.message);
  }
}
