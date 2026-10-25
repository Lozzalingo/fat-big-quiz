/**
 * Checkout Module - Fat Big Quiz
 *
 * Handles product checkout via the centralised Payments service.
 * Migrated from Next.js API route (app/api/checkout/route.ts) to Express.
 *
 * Routes:
 *   POST /api/checkout - Create checkout session for one or more products
 */

const prisma = require('../utils/prisma');

const PAYMENTS_URL = (process.env.PAYMENTS_SERVICE_URL || 'https://payments.laurence.computer').replace(/\/+$/, '');
const PAYMENTS_KEY = process.env.PAYMENTS_API_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fatbigquiz.com';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT || 'https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com';
const CDN_FOLDER = process.env.DO_SPACES_FOLDER || 'fat-big-quiz';

function getProductImageUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${CDN_ENDPOINT}/${CDN_FOLDER}/products/images/${filename}`;
}

// In-memory rate limiter (10 requests per minute per IP)
const rateLimits = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(ip);
  }
}, 60 * 1000);

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  entry.count++;
  return entry.count <= 10;
}

function registerRoutes(app) {

  app.post('/api/checkout', async (req, res) => {
    try {
      // Rate limiting
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
      if (!checkRateLimit(ip)) {
        console.log('[Checkout] Rate limit exceeded for IP:', ip);
        return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
      }

      const body = req.body;

      // Support both single-product and multi-product (cart) checkout
      const items = body.items || [];
      const email = body.email;

      // Legacy single-product payload fallback
      if (items.length === 0 && body.productId) {
        items.push({
          id: body.productId,
          amount: 1,
          slug: body.slug,
        });
      }

      if (items.length === 0) {
        console.log('[Checkout] Rejected: no items');
        return res.status(400).json({ error: 'No items provided' });
      }

      // Look up all products from the database (never trust client-supplied prices)
      const productIds = items.map((item) => item.id);
      const dbProducts = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, title: true, price: true, mainImage: true, productType: true, slug: true },
      });

      const productMap = new Map(dbProducts.map((p) => [p.id, p]));

      // Validate all products exist
      const missingIds = productIds.filter((id) => !productMap.has(id));
      if (missingIds.length > 0) {
        console.log('[Checkout] Rejected: invalid product IDs:', missingIds);
        return res.status(400).json({ error: 'One or more products not found' });
      }

      console.log('[Checkout] Request:', {
        itemCount: items.length,
        email: email ? 'provided' : 'guest',
      });

      // Look up userId if email provided
      let userId = null;
      if (email) {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        userId = user?.id || null;
      }

      // Determine if any item is a digital download (for success URL)
      const hasDigitalDownload = items.some((item) => {
        const product = productMap.get(item.id);
        return product.productType === 'DIGITAL_DOWNLOAD';
      });

      // Build line items in the format the payments service expects
      const lineItems = items.map((item) => {
        const product = productMap.get(item.id);

        const lineItem = {
          name: product.title,
          amount: Math.round(product.price * 100),
          currency: 'gbp',
          quantity: item.amount,
        };

        // Add image if available (requires HTTPS URLs)
        const imageUrl = getProductImageUrl(product.mainImage);
        if (imageUrl && imageUrl.startsWith('https://')) {
          lineItem.images = [imageUrl];
        }

        return lineItem;
      });

      // For single product, use product-specific URLs. For cart, use generic ones.
      const isSingleProduct = items.length === 1;
      const firstItem = items[0];
      const firstProduct = productMap.get(firstItem.id);

      const successUrl = hasDigitalDownload
        ? `${BASE_URL}/download/{CHECKOUT_SESSION_ID}`
        : `${BASE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`;

      const cancelUrl = isSingleProduct && firstProduct.slug
        ? `${BASE_URL}/product/${firstProduct.slug}?canceled=true`
        : `${BASE_URL}/cart`;

      // Store product IDs as JSON in metadata for the webhook
      const productSlugs = items
        .map((item) => productMap.get(item.id)?.slug || '')
        .filter(Boolean);

      const response = await fetch(`${PAYMENTS_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pay-Key': PAYMENTS_KEY,
        },
        body: JSON.stringify({
          line_items: lineItems,
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: email || undefined,
          metadata: {
            productIds: JSON.stringify(productIds),
            productSlugs: JSON.stringify(productSlugs),
            productType: firstProduct.productType || 'DIGITAL_DOWNLOAD',
            userId: userId || '',
            // Legacy single-product fields for backward compatibility
            ...(isSingleProduct && {
              productId: firstItem.id,
              slug: firstProduct.slug || '',
            }),
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('[Checkout] Payments service error:', response.status, errData);
        throw new Error(errData.error || `Payments service returned ${response.status}`);
      }

      const data = await response.json();

      console.log('[Checkout] Session created:', data.session_id || data.sessionId, `(${items.length} items)`);
      return res.json({ sessionId: data.session_id || data.sessionId, url: data.checkout_url || data.url });
    } catch (error) {
      console.error('[Checkout] Error:', error.message);
      return res.status(500).json({ error: error.message || 'Error creating checkout session' });
    }
  });

  console.log('[FBQ] Checkout module registered');
}

module.exports = { registerRoutes };
