/**
 * Webhooks Module - Fat Big Quiz
 *
 * Handles signed webhook callbacks from the Payments service.
 * Includes one-time purchase processing and subscription lifecycle events.
 * Migrated from Next.js API route (app/api/webhooks/stripe/route.ts) to Express.
 *
 * Routes:
 *   POST /api/webhooks/stripe - Signed webhook from Payments service
 */

const { createHmac } = require('crypto');
const prisma = require('../utils/prisma');
const {
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendAdminSaleNotification,
} = require('../services/email');

const WEBHOOK_SECRET = process.env.PAYMENTS_WEBHOOK_SECRET || '';
const API_BASE = `http://127.0.0.1:${process.env.PORT || 3001}`;

/**
 * Verify the X-Pay-Signature HMAC header from the payments service.
 */
function verifySignature(body, signature) {
  if (!WEBHOOK_SECRET) {
    console.error('[Webhooks] No PAYMENTS_WEBHOOK_SECRET configured');
    return false;
  }
  const expected = createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  return signature === expected;
}

/**
 * Normalise a payments service callback into a consistent format.
 */
function normaliseEvent(raw) {
  if (raw.type && raw.data) {
    return { type: raw.type, data: raw.data.object || raw.data };
  }
  const type = raw.event_type || raw.type || 'unknown';
  const { event_type: _et, ...data } = raw;
  return { type, data };
}

/**
 * Normalise the payments service's flat subscription callback.
 */
function normaliseSubscriptionData(data) {
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
 * Extract period end from a subscription.
 */
function getPeriodEnd(subscription) {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (itemEnd) return itemEnd;
  if (subscription.current_period_end) return subscription.current_period_end;
  return subscription.cancel_at || (subscription.billing_cycle_anchor + 30 * 24 * 60 * 60);
}

// ─── Subscription Handlers ───────────────────────────────────────────────────

async function handleSubscriptionCheckout(session) {
  const metadata = session.metadata || {};
  const userId = metadata.userId;
  const subscriptionId = session.subscription_id || session.subscription;

  if (!userId || !subscriptionId) {
    console.error('[Webhooks] Subscription checkout missing userId or subscriptionId');
    return;
  }

  const customerId = session.customer_id || session.customer;
  if (customerId) {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (existingUser && !existingUser.stripeCustomerId) {
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
      console.log('[Webhooks] Stored customer ID from subscription checkout:', customerId);
    }
  }

  const periodEnd = session.current_period_end
    || session.subscription_period_end
    || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Webhooks] Subscription activated for user ${userId}, expires: ${new Date(periodEnd * 1000).toISOString()}`);
}

async function updateUserSubscription(subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Webhooks] No user found for customer: ${customerId}`);
    return;
  }

  const status = subscription.status === 'active' || subscription.status === 'trialing'
    ? 'active'
    : subscription.status;

  const periodEnd = getPeriodEnd(subscription);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Webhooks] Subscription updated for ${user.email}: ${status}, expires: ${new Date(periodEnd * 1000).toISOString()}`);
}

async function cancelUserSubscription(subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Webhooks] No user found for customer: ${customerId}`);
    return;
  }

  const periodEnd = getPeriodEnd(subscription);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: 'cancelled',
      subscriptionExpiresAt: new Date(periodEnd * 1000),
    },
  });

  console.log(`[Webhooks] Subscription cancelled for ${user.email}, access until: ${new Date(periodEnd * 1000).toISOString()}`);
}

// ─── One-time Purchase Handler ───────────────────────────────────────────────

async function handleCheckoutCompleted(eventData) {
  const session = eventData;

  // Handle subscription checkout separately
  if (session.mode === 'subscription') {
    await handleSubscriptionCheckout(session);
    return;
  }

  const metadata = session.metadata || {};
  const customerEmail = session.customer_email || session.customer_details?.email;
  const sessionId = session.session_id || session.id;
  const paymentIntentId = session.payment_intent_id || session.payment_intent;

  // Resolve all product IDs from metadata
  let allProductIds = [];
  if (metadata.productIds) {
    try {
      allProductIds = JSON.parse(metadata.productIds);
    } catch {
      console.error('[Webhooks] Failed to parse productIds metadata');
    }
  }
  if (allProductIds.length === 0 && metadata.productId) {
    allProductIds = [metadata.productId];
  }

  const productType = metadata.productType;
  const userId = metadata.userId;

  // Get product names from line items
  let productNames = [];
  if (session.line_items) {
    const items = Array.isArray(session.line_items) ? session.line_items : session.line_items?.data || [];
    productNames = items.map((item) => item.description || 'Quiz Pack');
  }
  const productName = productNames.length > 0 ? productNames.join(', ') : 'Quiz Pack';
  const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : '0.00';

  console.log('[Webhooks] Checkout completed:', { productIds: allProductIds, productType, email: customerEmail, amount: amountTotal });

  if (allProductIds.length === 0) {
    console.error('[Webhooks] No product IDs found in metadata for session:', sessionId);
    return;
  }

  if (!customerEmail) {
    console.error('[Webhooks] No customer email found for session:', sessionId);
    return;
  }

  try {
    // Create a purchase record for each product (with idempotency check)
    const crypto = require('crypto');
    for (const pid of allProductIds) {
      if (sessionId) {
        const existing = await prisma.purchase.findFirst({
          where: { stripeSessionId: sessionId, productId: pid },
        });
        if (existing) {
          console.log('[Webhooks] Duplicate purchase skipped:', { productId: pid, sessionId });
          continue;
        }
      }

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

      console.log('[Webhooks] Purchase record created:', { email: customerEmail, productId: pid });
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
      console.error('[Webhooks] Failed to fetch product images:', imgErr.message);
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

    // Record a sale if shipping is present (physical order)
    if (session.shipping?.address) {
      const { shipping, line_items: lineItems = [] } = session;
      const addr = shipping.address || {};

      try {
        await prisma.sale.create({
          data: {
            channel: 'WEBSITE',
            externalReceiptId: sessionId,
            buyerEmail: customerEmail,
            buyerName: shipping.name || null,
            grandTotal: session.amount_total || 0,
            shippingLine1: addr.line1 || null,
            shippingLine2: addr.line2 || null,
            shippingCity: addr.city || null,
            shippingState: addr.state || null,
            shippingPostalCode: addr.postal_code || null,
            shippingCountry: addr.country || null,
            status: 'PAID',
            paidAt: new Date(),
            items: {
              create: (Array.isArray(lineItems) ? lineItems : []).map((item) => ({
                title: item.description || item.name || productName,
                quantity: item.quantity || 1,
                unitPrice: item.amount_total || item.price?.unit_amount || 0,
              })),
            },
          },
        });
        console.log('[Webhooks] Sale record created for session:', sessionId);
      } catch (saleErr) {
        console.error('[Webhooks] Failed to create sale record:', saleErr.message);
      }
    }

    console.log(`[Webhooks] Checkout fully processed for session: ${sessionId}`);
  } catch (error) {
    console.error('[Webhooks] Error processing checkout:', error);
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function registerRoutes(app) {

  // Raw body middleware is registered in app.js BEFORE express.json() for HMAC verification
  app.post('/api/webhooks/stripe', async (req, res) => {
    // Body is a Buffer thanks to express.raw() registered in app.js
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const signature = req.headers['x-pay-signature'];

    if (!signature) {
      console.log('[Webhooks] Rejected: missing X-Pay-Signature header');
      return res.status(400).json({ error: 'Missing X-Pay-Signature header' });
    }

    if (!verifySignature(rawBody, signature)) {
      console.error('[Webhooks] Signature verification failed');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    let raw;
    try {
      raw = typeof req.body === 'string' || Buffer.isBuffer(req.body) ? JSON.parse(rawBody) : req.body;
    } catch (err) {
      console.error('[Webhooks] Failed to parse body:', err.message);
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { type: eventType, data: eventData } = normaliseEvent(raw);
    console.log('[Webhooks] Received:', eventType);

    switch (eventType) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(eventData);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = normaliseSubscriptionData(eventData);
        await updateUserSubscription(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = normaliseSubscriptionData(eventData);
        await cancelUserSubscription(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const customerEmail = eventData.customer_email;
        const subId = eventData.subscription_id;
        if (subId) {
          console.log(`[Webhooks] Subscription payment failed for: ${customerEmail}`);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const intentId = eventData.payment_intent_id || eventData.id;
        console.log(`[Webhooks] PaymentIntent succeeded: ${intentId}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const intentId = eventData.payment_intent_id || eventData.id;
        console.log(`[Webhooks] Payment failed: ${intentId}`);
        break;
      }

      default:
        console.log(`[Webhooks] Unhandled event type: ${eventType}`);
    }

    return res.json({ received: true });
  });

  console.log('[FBQ] Webhooks module registered');
}

module.exports = { registerRoutes };
