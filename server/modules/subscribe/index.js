/**
 * Subscribe Module - Fat Big Quiz
 *
 * Handles quiz database subscription checkout, status checks, and billing portal.
 * Migrated from Next.js API routes to Express (was using getServerSession/NextAuth).
 *
 * Routes:
 *   POST /api/subscribe         - Create subscription checkout session
 *   GET  /api/subscribe/status  - Check current user's subscription status
 *   POST /api/subscribe/portal  - Get billing portal URL
 */

const { PrismaClient } = require('@prisma/client');
const { verifyJWT, COOKIE_NAME } = require('../auth');

const prisma = new PrismaClient();

const PAYMENTS_URL = (process.env.PAYMENTS_SERVICE_URL || 'https://payments.laurence.computer').replace(/\/+$/, '');
const PAYMENTS_KEY = process.env.PAYMENTS_API_KEY || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://fatbigquiz.com';

// ─── Auth Middleware ─────────────────────────────────────────────────────────

function getAuthUser(req) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  return verifyJWT(token);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

function registerRoutes(app) {

  // POST /api/subscribe - create subscription checkout session
  app.post('/api/subscribe', async (req, res) => {
    try {
      const payload = getAuthUser(req);
      if (!payload?.email) {
        console.log('[Subscribe] Checkout rejected - not logged in');
        return res.status(401).json({ error: 'You must be logged in to subscribe' });
      }

      const email = payload.email.toLowerCase().trim();
      console.log('[Subscribe] Subscription request for:', email);

      // Find local user
      const user = await prisma.user.findFirst({ where: { email } });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.subscriptionStatus === 'active') {
        console.log('[Subscribe] User already has active subscription');
        return res.status(400).json({ error: 'You already have an active subscription' });
      }

      // Call centralised payments service for subscription checkout
      const response = await fetch(`${PAYMENTS_URL}/api/payments/checkout/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pay-Key': PAYMENTS_KEY,
        },
        body: JSON.stringify({
          customer_email: email,
          line_items: [
            {
              price_data: {
                currency: 'gbp',
                product_data: {
                  name: 'Quiz Database Access',
                  description: 'Full access to the Fat Big Quiz question database with 59,000+ questions, quiz builder, lucky dip, and export tools.',
                },
                unit_amount: 999,
                recurring: { interval: 'month' },
              },
              quantity: 1,
            },
          ],
          success_url: `${BASE_URL}/quiz-database?subscribed=true`,
          cancel_url: `${BASE_URL}/quiz-database?cancelled=true`,
          metadata: {
            userId: user.id,
            type: 'quiz-database-subscription',
          },
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('[Subscribe] Payments service error:', response.status, errData);
        throw new Error(errData.error || `Payments service returned ${response.status}`);
      }

      const data = await response.json();

      // Store Stripe customer ID if new
      if (data.customer_id && !user.stripeCustomerId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: data.customer_id },
        });
        console.log('[Subscribe] Stored customer ID:', data.customer_id);
      }

      console.log('[Subscribe] Checkout session created:', data.session_id || data.sessionId);
      return res.json({ url: data.checkout_url || data.url });
    } catch (error) {
      console.error('[Subscribe] Checkout error:', error.message);
      return res.status(500).json({ error: error.message || 'Error creating subscription' });
    }
  });

  // GET /api/subscribe/status - check subscription status
  app.get('/api/subscribe/status', async (req, res) => {
    try {
      const payload = getAuthUser(req);

      if (!payload?.email) {
        return res.json({
          hasAccess: false,
          status: 'none',
          loggedIn: false,
        });
      }

      const email = payload.email.toLowerCase().trim();

      // Find local user
      const user = await prisma.user.findFirst({
        where: { email },
        select: {
          id: true,
          role: true,
          subscriptionStatus: true,
          subscriptionExpiresAt: true,
        },
      });

      // Admins always have access
      if (user?.role === 'admin') {
        return res.json({
          hasAccess: true,
          status: 'admin',
          loggedIn: true,
        });
      }

      // Check if subscription is active and not expired
      const isActive = user?.subscriptionStatus === 'active';
      const notExpired = !user?.subscriptionExpiresAt || new Date(user.subscriptionExpiresAt) > new Date();
      const hasAccess = isActive && notExpired;

      return res.json({
        hasAccess,
        status: user?.subscriptionStatus || 'none',
        expiresAt: user?.subscriptionExpiresAt,
        loggedIn: true,
      });
    } catch (error) {
      console.error('[Subscribe] Status check error:', error.message);
      return res.status(500).json({ hasAccess: false, status: 'error', loggedIn: false });
    }
  });

  // POST /api/subscribe/portal - billing portal
  app.post('/api/subscribe/portal', async (req, res) => {
    try {
      const payload = getAuthUser(req);
      if (!payload?.email) {
        return res.status(401).json({ error: 'Not logged in' });
      }

      const email = payload.email.toLowerCase().trim();
      const user = await prisma.user.findFirst({ where: { email } });

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: 'No subscription found' });
      }

      const response = await fetch(`${PAYMENTS_URL}/api/payments/billing-portal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pay-Key': PAYMENTS_KEY,
        },
        body: JSON.stringify({
          customer_id: user.stripeCustomerId,
          return_url: `${BASE_URL}/quiz-database`,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('[Subscribe] Billing portal service error:', response.status, errData);
        throw new Error(errData.error || `Payments service returned ${response.status}`);
      }

      const data = await response.json();

      console.log('[Subscribe] Portal session created for:', email);
      return res.json({ url: data.portal_url || data.url });
    } catch (error) {
      console.error('[Subscribe] Portal error:', error.message);
      return res.status(500).json({ error: error.message || 'Error creating portal session' });
    }
  });

  console.log('[FBQ] Subscribe module registered');
}

module.exports = { registerRoutes };
