/**
 * Payments Callback Controller
 *
 * Receives server-to-server POST from the Payments service.
 * Verified via X-Pay-Key header (must match PAYMENTS_CALLBACK_KEY env var).
 *
 * Payload:
 * {
 *   event_type: 'checkout.session.completed',
 *   session_id: 'cs_...',
 *   payment_intent_id: 'pi_...',
 *   customer_email: '...',
 *   amount_total: 2500,        // pence
 *   currency: 'gbp',
 *   metadata: { productIds, productType, userId, ... },
 *   line_items: [...],
 *   shipping: { name, address: { line1, line2, city, state, postal_code, country } }
 * }
 */

const prisma = require('../../utils/prisma');
const {
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendAdminSaleNotification,
} = require('../../services/email');

const CALLBACK_KEY = process.env.PAYMENTS_CALLBACK_KEY || '';

async function handleCallback(req, res) {
  // Verify X-Pay-Key header
  const payKey = req.headers['x-pay-key'];
  if (!CALLBACK_KEY) {
    console.error('[Payments Callback] PAYMENTS_CALLBACK_KEY not configured');
    return res.status(500).json({ error: 'Callback key not configured' });
  }
  if (!payKey || payKey !== CALLBACK_KEY) {
    console.error('[Payments Callback] Rejected: invalid or missing X-Pay-Key header');
    return res.status(401).json({ error: 'Unauthorised' });
  }

  const body = req.body;
  const eventType = body.event_type;

  console.log('[Payments Callback] Received event:', eventType);

  if (!eventType) {
    console.error('[Payments Callback] Missing event_type in payload');
    return res.status(400).json({ error: 'Missing event_type' });
  }

  switch (eventType) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(body);
      break;

    default:
      console.log(`[Payments Callback] Unhandled event type: ${eventType}`);
  }

  return res.json({ received: true });
}

async function handleCheckoutCompleted(payload) {
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
    console.error('[Payments Callback] No customer_email in payload, session:', sessionId);
    return;
  }

  const amountTotal = amountTotalPence ? (amountTotalPence / 100).toFixed(2) : '0.00';

  // Resolve product IDs from metadata
  let allProductIds = [];
  if (metadata.productIds) {
    try {
      allProductIds = JSON.parse(metadata.productIds);
    } catch {
      console.error('[Payments Callback] Failed to parse productIds metadata');
    }
  }
  // Legacy single-product fallback
  if (allProductIds.length === 0 && metadata.productId) {
    allProductIds = [metadata.productId];
  }

  const productType = metadata.productType || '';
  const userId = metadata.userId || null;

  // Build product name from line items
  const productNames = lineItems.map(
    (item) => item.description || item.name || 'Quiz Pack'
  );
  const productName = productNames.length > 0 ? productNames.join(', ') : 'Quiz Pack';

  console.log('[Payments Callback] Checkout completed:', {
    sessionId,
    productIds: allProductIds,
    productType,
    email: customerEmail,
    amount: amountTotal,
  });

  if (allProductIds.length === 0) {
    console.error('[Payments Callback] No product IDs in metadata for session:', sessionId);
    return;
  }

  try {
    // Create a purchase record for each product (with idempotency check)
    for (const pid of allProductIds) {
      // Check for duplicate
      if (sessionId) {
        const existing = await prisma.purchase.findFirst({
          where: { stripeSessionId: sessionId, productId: pid },
        });
        if (existing) {
          console.log('[Payments Callback] Duplicate purchase skipped:', { productId: pid, sessionId });
          continue;
        }
      }

      const crypto = require('crypto');
      const downloadToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = userId ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.purchase.create({
        data: {
          productId: pid,
          email: customerEmail,
          userId: userId || null,
          stripeSessionId: sessionId || null,
          stripePaymentId: paymentIntentId || null,
          downloadToken,
          expiresAt,
          status: 'completed',
          downloadCount: 0,
        },
      });

      console.log('[Payments Callback] Purchase record created:', {
        email: customerEmail,
        productId: pid,
      });
    }

    // Record a Sale if shipping is present (physical order)
    if (shipping && shipping.address) {
      await recordSale({ payload, productName, amountTotalPence, customerEmail, sessionId });
    }

    // Send confirmation email
    if (productType === 'DIGITAL_DOWNLOAD') {
      await sendPurchaseConfirmationEmail(customerEmail, {
        productName,
        price: amountTotal,
        sessionId,
      });
    } else {
      await sendOrderConfirmationEmail(customerEmail, {
        productName,
        price: amountTotal,
        orderType: productType,
      });
    }

    // Fetch product images for admin notification
    let productImages = [];
    try {
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: allProductIds } },
        select: { mainImage: true },
      });
      productImages = dbProducts.map((p) => p.mainImage).filter(Boolean);
    } catch (imgErr) {
      console.error('[Payments Callback] Failed to fetch product images:', imgErr.message);
    }

    // Send admin notification
    await sendAdminSaleNotification({
      customerEmail,
      productName,
      price: amountTotal,
      productType,
      sessionId,
      productImages,
    });

    console.log(`[Payments Callback] Checkout fully processed for session: ${sessionId}`);
  } catch (error) {
    console.error('[Payments Callback] Error processing checkout:', error);
  }
}

/**
 * Record a website Sale in the database for physical orders.
 */
async function recordSale({ payload, productName, amountTotalPence, customerEmail, sessionId }) {
  const { shipping, line_items: lineItems = [] } = payload;
  const addr = shipping?.address || {};

  try {
    await prisma.sale.create({
      data: {
        channel: 'WEBSITE',
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
        status: 'PAID',
        paidAt: new Date(),
        items: {
          create: lineItems.map((item) => ({
            title: item.description || item.name || productName,
            quantity: item.quantity || 1,
            unitPrice: item.amount_total || item.price?.unit_amount || 0,
          })),
        },
      },
    });
    console.log('[Payments Callback] Sale record created for session:', sessionId);
  } catch (saleErr) {
    // Non-fatal: purchase records are the source of truth for fulfilment
    console.error('[Payments Callback] Failed to create sale record:', saleErr.message);
  }
}

module.exports = { handleCallback };
