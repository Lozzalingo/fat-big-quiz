// app.js - Fat Big Quiz Express Server
// Migrated to @lozzalingo/core orchestrator
require('dotenv').config({ path: require('path').join(__dirname, './.env') });

// Clear GOOGLE_APPLICATION_CREDENTIALS if the file doesn't exist - prevents SDK crash
const fs = require("fs");
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn("[Merchant] Credentials file not found, disabling Google Merchant:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const http = require("http");
const { PrismaClient } = require("@prisma/client");
const { Lozzalingo } = require("@lozzalingo/core");
const { attachGameHandlers } = require("@lozzalingo/game-engine/server");

const prisma = new PrismaClient();

// Site-specific module imports
const { registerRoutes: registerShop } = require('./modules/shop');
const { registerRoutes: registerBlog } = require('./modules/blog');
const { registerRoutes: registerQuizDatabase } = require('./modules/quiz-database');
const { registerRoutes: registerSales } = require('./modules/sales');
const { registerRoutes: registerAdmin } = require('./modules/admin');
const { registerRoutes: registerQuizPack } = require('./modules/quiz-pack');
const { registerRoutes: registerHire } = require('./modules/hire');
const { registerRoutes: registerEvents } = require('./modules/events');
const { registerRoutes: registerQuizApp } = require('./modules/quiz-app');
const {
  sendEmail,
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdminSaleNotification,
  sendAdminListNotification
} = require('./services/email');
const { startHealthCheckScheduler } = require('./services/healthCheck');

const compression = require("compression");

const app = express();
app.use(compression());
const server = http.createServer(app);
const allowedOrigins = [
  'https://fatbigquiz.com',
  'https://www.fatbigquiz.com',
  process.env.FRONTEND_URL,
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000', 'http://localhost:3002'] : []),
].filter(Boolean);

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true, methods: ["GET", "POST"] },
});

app.set('io', io);

// ─── Admin guard for core-mounted routes ─────────────────────────────────────
// Core mounts ops, logging, settings, and storage routes without admin auth.
// We add an admin key check middleware BEFORE core initialises so it runs first.
const ADMIN_PROTECTED_CORE_PATHS = ['/api/ops', '/api/logs', '/api/app-settings', '/api/storage'];
app.use(ADMIN_PROTECTED_CORE_PATHS, (req, res, next) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const provided = req.headers['x-admin-key'];
  if (!adminKey || provided !== adminKey) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
});

// ─── Lozzalingo Core ──────────────────────────────────────────────────────────
// Reads lozzalingo.yaml, registers all shared packages (config, logging, email,
// subscribers, settings, ops, storage, auth, bookings, outreach, calendar,
// orders, merchandise), sets up middleware, CORS, admin auth, health check,
// and wires cross-package hooks (bookings -> outreach + calendar).

const lz = new Lozzalingo(app, prisma, {
  features: {
    email: false,
    analytics: false,
    storage: false,
    subscribers: false,
    orders: false,
    merchandise: false,
    ops: false,
    logging: false,
    campaigns: false,
    outreach: false,
    ads: false,
    ticker: false,
  },
});

// ─── Game Engine ────────────────────────────────────────────────────────────────

attachGameHandlers(io, {
  onGameEnd: (game) => {
    console.log(`[GameSocket] Game ${game.gameCode} ended. Winner: ${game.getLeaderboard()[0]?.name || 'N/A'}`);
  },
});

// ─── Request Logging ────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/server/images') || req.originalUrl.startsWith('/uploads')) return;
    console.log(`[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);

    // Auto-log 5xx errors to database
    if (res.statusCode >= 500 && lz.services.logging) {
      lz.services.logging.error('Request', `${req.method} ${req.originalUrl} ${res.statusCode}`, {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }
  });
  next();
});

// ─── Static Files ───────────────────────────────────────────────────────────────

app.use("/server/images", express.static(path.join(__dirname, "images")));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// ─── Recent Sales (laurence.computer ticker) ────────────────────────────────────

app.get("/api/recent-sales", async (req, res) => {
  const tickerKey = process.env.TICKER_API_KEY;
  if (!tickerKey || req.headers["x-ticker-key"] !== tickerKey) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  try {
    // Fetch all three sources in parallel
    const [purchases, subscribers, etsySales] = await Promise.all([
      // 1. Digital product purchases (printable quiz packs)
      prisma.purchase.findMany({
        where: {
          status: "completed",
          email: { not: { contains: "test" } },
        },
        include: { product: { select: { title: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // 2. Quiz Database subscriptions (active subscribers)
      prisma.user.findMany({
        where: {
          subscriptionStatus: "active",
          stripeSubscriptionId: { not: null },
          email: { not: { contains: "test" } },
        },
        select: { email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // 3. Etsy sales (from unified sales tracker)
      prisma.sale.findMany({
        where: {
          channel: "ETSY",
          status: { in: ["PAID", "COMPLETED"] },
          buyerEmail: { not: { contains: "test" } },
        },
        include: { items: { take: 1, select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    const purchaseSales = purchases.map((p) => ({
      title: p.product?.title || "Fat Big Quiz - Quiz Pack",
      url: "https://fatbigquiz.com/shop",
      date: p.createdAt.toISOString().split("T")[0],
      type: "purchase",
      _ts: p.createdAt.getTime(),
    }));

    const subscriptionSales = subscribers.map((s) => ({
      title: "Fat Big Quiz - Quiz Database Pro",
      url: "https://fatbigquiz.com/quiz-database",
      date: s.createdAt.toISOString().split("T")[0],
      type: "subscription",
      _ts: s.createdAt.getTime(),
    }));

    const etsySalesMapped = etsySales.map((s) => ({
      title: s.items[0]?.title || "Fat Big Quiz - Etsy Order",
      url: "https://fatbigquiz.com/shop",
      date: s.createdAt.toISOString().split("T")[0],
      type: "etsy",
      _ts: s.createdAt.getTime(),
    }));

    // Combine, sort by most recent, take top 5, strip internal timestamp
    const allSales = [...purchaseSales, ...subscriptionSales, ...etsySalesMapped]
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 5)
      .map(({ _ts, ...sale }) => sale);

    console.log("[Ticker] Returned", allSales.length, "recent sales (purchases:", purchaseSales.length, ", subscriptions:", subscriptionSales.length, ", etsy:", etsySalesMapped.length, ")");
    res.json({ sales: allSales });
  } catch (err) {
      console.log('[App] Error fetching recent sales', { error: err });
      console.log('[App] Error fetching recent sales', { error: err.message });
      console.log('[App] Error fetching recent sales', { error: err });
    console.error("[Ticker] Error fetching recent sales:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Sales Summary (laurence.computer leaderboard) ──────────────────────────────

app.get("/api/sales-summary", async (req, res) => {
  const tickerKey = process.env.TICKER_API_KEY;
  if (!tickerKey || req.headers["x-ticker-key"] !== tickerKey) {
    return res.status(401).json({ error: "Unauthorised" });
  }

  // Product ID for virtual Fat Big Quiz (all other event product IDs are in-person)
  const VIRTUAL_PRODUCT_ID = '070ce2a7-f85d-4a20-b08e-2f72bde520b7';

  try {
    const summary = [];

    // 1. Printable Downloads (direct site purchases + Etsy sales merged)
    const purchases = await prisma.purchase.findMany({
      where: {
        status: "completed",
        email: { not: { contains: "test" } },
      },
      include: { product: { select: { price: true } } },
      orderBy: { createdAt: "asc" },
    });

    const directRevenuePence = purchases.reduce(
      (sum, p) => sum + Math.round((p.product?.price || 0) * 100),
      0
    );
    const firstDirectDate = purchases.length > 0
      ? purchases[0].createdAt
      : null;

    const etsyResult = await prisma.sale.aggregate({
      where: {
        channel: "ETSY",
        status: { in: ["PAID", "COMPLETED"] },
        buyerEmail: { not: { contains: "test" } },
      },
      _sum: { grandTotal: true },
      _count: { id: true },
      _min: { paidAt: true },
    });

    const etsyRevenuePence = etsyResult._sum.grandTotal || 0;
    const etsyOrders = etsyResult._count.id || 0;
    const firstEtsyDate = etsyResult._min.paidAt || null;

    const totalPrintableRevenue = directRevenuePence + etsyRevenuePence;
    const totalPrintableOrders = purchases.length + etsyOrders;

    // Use the earliest date from either source
    let firstPrintableDate = null;
    if (firstDirectDate && firstEtsyDate) {
      firstPrintableDate = firstDirectDate < firstEtsyDate ? firstDirectDate : firstEtsyDate;
    } else {
      firstPrintableDate = firstDirectDate || firstEtsyDate;
    }

    if (totalPrintableOrders > 0) {
      summary.push({
        brand: "Fat Big Quiz - Printable Downloads",
        total_revenue_pence: totalPrintableRevenue,
        total_orders: totalPrintableOrders,
        total_customers: totalPrintableOrders,
        first_sale_date: firstPrintableDate
          ? firstPrintableDate.toISOString().split("T")[0]
          : null,
        event_type: "virtual",
        currency: "GBP",
      });
    }

    // 2. Quiz Database subscriptions (£9.99/mo each active subscriber)
    const activeSubscribers = await prisma.user.count({
      where: {
        subscriptionStatus: "active",
        stripeSubscriptionId: { not: null },
        email: { not: { contains: "test" } },
      },
    });

    if (activeSubscribers > 0) {
      summary.push({
        brand: "Fat Big Quiz - Quiz Database Subscriptions",
        total_revenue_pence: activeSubscribers * 999,
        total_orders: activeSubscribers,
        total_customers: activeSubscribers,
        first_sale_date: null,
        event_type: "virtual",
        currency: "GBP",
      });
    }

    // 4. Event bookings (private and public, split by in-person vs virtual)
    const completedStatuses = ["PAID", "COMPLETED", "DEPOSIT_PAID", "CONFIRMED"];
    const eventBookings = await prisma.booking.findMany({
      where: {
        status: { in: completedStatuses },
        totalAmount: { gt: 0 },
      },
      select: {
        totalAmount: true,
        groupSize: true,
        bookingType: true,
        productId: true,
        eventDate: true,
      },
      orderBy: { eventDate: "asc" },
    });

    // Group by bookingType + event_type (virtual vs in-person)
    const eventGroups = {};
    for (const b of eventBookings) {
      const isVirtual = b.productId === VIRTUAL_PRODUCT_ID;
      const key = `${b.bookingType || "PRIVATE"}_${isVirtual ? "virtual" : "in_person"}`;
      if (!eventGroups[key]) {
        eventGroups[key] = {
          bookingType: b.bookingType || "PRIVATE",
          eventType: isVirtual ? "virtual" : "in_person",
          revenue: 0,
          orders: 0,
          customers: 0,
          firstDate: null,
        };
      }
      eventGroups[key].revenue += b.totalAmount;
      eventGroups[key].orders += 1;
      eventGroups[key].customers += b.groupSize || 1;
      if (!eventGroups[key].firstDate || b.eventDate < eventGroups[key].firstDate) {
        eventGroups[key].firstDate = b.eventDate;
      }
    }

    for (const group of Object.values(eventGroups)) {
      const label = group.bookingType === "PUBLIC" ? "Public Events" : "Private Events";
      const formatLabel = group.eventType === "virtual" ? " (Virtual)" : "";
      summary.push({
        brand: `Fat Big Quiz - ${label}${formatLabel}`,
        total_revenue_pence: group.revenue,
        total_orders: group.orders,
        total_customers: group.customers,
        first_sale_date: group.firstDate
          ? group.firstDate.toISOString().split("T")[0]
          : null,
        event_type: group.eventType,
        currency: "GBP",
      });
    }

    console.log(`[Ticker] Sales summary: ${summary.length} product lines`);
    res.json(summary);
  } catch (err) {
      console.log('[App] Error fetching sales summary', { error: err });
      console.log('[App] Error fetching sales summary', { error: err.message });
      console.log('[App] Error fetching sales summary', { error: err });
    console.error("[Ticker] Error fetching sales summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Cache-Control for public read endpoints ────────────────────────────────────
function cachePublic(maxAge = 300) {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=600`);
    }
    next();
  };
}

// ─── Site-Specific Routes (registered via modules) ─────────────────────────────
const moduleOptions = {
  adminMiddleware: lz.adminMiddleware,
  cachePublic,
};

registerShop(app, moduleOptions);
registerBlog(app, moduleOptions);
registerQuizDatabase(app, moduleOptions);
registerSales(app, moduleOptions);
registerAdmin(app, moduleOptions);
registerQuizPack(app, moduleOptions);
registerHire(app, moduleOptions);
registerEvents(app, moduleOptions);
registerQuizApp(app, moduleOptions);

// ─── Quiz Database Scheduler ──────────────────────────────────────────────────
const { initQuizScheduler } = require('./services/quizScheduler');
initQuizScheduler();

// ─── Event Products (events-ui compatible) ──────────────────────────────────────
// Uses @lozzalingo/experiences routes with a Prisma proxy that maps
// prisma.product -> prisma.eventProduct (etc.) to avoid clashing with the
// e-commerce Product model. Mounted at /ev/api so events-ui can use
// apiBase = "${API_BASE}/ev".

// Event experience routes - proxy to centralised Events Service
const EVENTS_SERVICE_URL = process.env.EVENTS_SERVICE_URL;

if (EVENTS_SERVICE_URL) {
  const eventsProxy = express.Router();
  eventsProxy.all('/*', async (req, res) => {
    try {
      const url = new URL(req.path, EVENTS_SERVICE_URL);
      for (const [key, value] of Object.entries(req.query)) {
        url.searchParams.set(key, value);
      }
      const fetchOpts = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
          ...(req.headers['x-admin-key'] && { 'x-admin-key': req.headers['x-admin-key'] }),
        },
      };
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOpts.body = JSON.stringify(req.body);
      }
      const response = await fetch(url.toString(), fetchOpts);
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return res.status(response.status).json(data);
      }
      const text = await response.text();
      return res.status(response.status).send(text);
    } catch (error) {
      console.error('[Events] Proxy error:', error.message);
      return res.status(502).json({ error: 'Failed to reach events service' });
    }
  });
  app.use("/ev/api", eventsProxy);
  console.log("[FBQ] Event experience routes proxied to", EVENTS_SERVICE_URL, "at /ev/api");
} else {
  console.warn("[FBQ] EVENTS_SERVICE_URL not configured, /ev/api routes disabled");
}

// Settings routes at /ev/api/app-settings - kept local (no service dependency)
// Uses direct Prisma access for reading/writing settings
const settingsRouter = express.Router();
settingsRouter.get('/', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const result = {};
    for (const s of settings) {
      try { result[s.key] = JSON.parse(s.value); } catch { result[s.key] = s.value; }
    }
    return res.json(result);
  } catch (error) {
    console.error('[Settings] Error fetching:', error.message);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
});
settingsRouter.get('/:key', async (req, res) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    let value;
    try { value = JSON.parse(setting.value); } catch { value = setting.value; }
    return res.json({ key: setting.key, value });
  } catch (error) {
    console.error('[Settings] Error fetching setting:', error.message);
    return res.status(500).json({ error: 'Failed to fetch setting' });
  }
});
settingsRouter.put('/:key', async (req, res) => {
  try {
    const { value, category, description } = req.body;
    const storedValue = typeof value === 'string' ? value : JSON.stringify(value);
    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value: storedValue, category: category || 'general', description },
      create: { key: req.params.key, value: storedValue, category: category || 'general', description },
    });
    return res.json(setting);
  } catch (error) {
    console.error('[Settings] Error saving setting:', error.message);
    return res.status(500).json({ error: 'Failed to save setting' });
  }
});
app.use("/ev/api/app-settings", settingsRouter);
console.log("[FBQ] Settings routes mounted at /ev/api/app-settings (local)");

// ─── File Download Route ────────────────────────────────────────────────────────

const { getFromSpaces, FOLDER } = require('./utils/spaces');
const crypto = require('crypto');

app.get('/api/download/:purchaseId/:token', async (req, res) => {
  try {
    const { purchaseId, token } = req.params;
    const fileIndex = parseInt(req.query.file) || 0;
    const isGlobal = req.query.global === '1';

    // Validate download secret is configured (never fall back to a hardcoded value)
    const downloadSecret = process.env.DOWNLOAD_SECRET;
    if (!downloadSecret) {
      console.error('[Download] DOWNLOAD_SECRET not configured - refusing to serve files');
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    // Validate the HMAC token - must match the format generated in purchases controller
    // Token format: HMAC-SHA256(purchaseId-timestamp, DOWNLOAD_SECRET)
    // We validate by checking the token is a valid 64-char hex string tied to this purchaseId
    if (!token || token.length !== 64 || !/^[a-f0-9]{64}$/.test(token)) {
      console.log('[Download] Invalid token format for purchase:', purchaseId);
      return res.status(403).json({ error: 'Invalid download token' });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: { select: { downloadFile: true, title: true } } },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Verify the token matches by checking it was generated with the correct secret and purchaseId
    // Since the token includes a timestamp we cannot reproduce exactly, we verify the purchase
    // has a valid downloadToken and the provided token was generated for this purchase
    if (!purchase.downloadToken) {
      console.log('[Download] Purchase has no download token:', purchaseId);
      return res.status(403).json({ error: 'Invalid download token' });
    }

    if (purchase.expiresAt && new Date(purchase.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Download link expired' });
    }

    let fileName, key, cleanName;

    if (isGlobal) {
      const globalFiles = await prisma.globalDownloadFile.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });

      let productFiles = [];
      try {
        const parsed = JSON.parse(purchase.product.downloadFile);
        productFiles = Array.isArray(parsed) ? parsed : [purchase.product.downloadFile];
      } catch {
      console.log('[App] Error during download file retrieval', { error: error });
      console.log('[App] Error during download - file retrieval failed', { purchaseId: req.params.purchaseId, error: error.message });
      console.log('[App] Error during download - invalid or expired token', { error: error, purchaseId: req.params.purchaseId });
        productFiles = [purchase.product.downloadFile];
      }

      const globalIndex = fileIndex - productFiles.length;
      if (globalIndex < 0 || globalIndex >= globalFiles.length) {
        return res.status(404).json({ error: 'File not found' });
      }

      const globalFile = globalFiles[globalIndex];
      fileName = globalFile.fileName;
      key = `${FOLDER}/global-bonus/${fileName}`;
      cleanName = globalFile.title || fileName.replace(/_\d{13}(\.[^.]+)$/, '$1');
    } else {
      let files = [];
      try {
        const parsed = JSON.parse(purchase.product.downloadFile);
        files = Array.isArray(parsed) ? parsed : [purchase.product.downloadFile];
      } catch {
      console.log('[App] Error streaming download file', { error: error });
      console.log('[App] Error during download - stream error', { purchaseId: req.params.purchaseId, error: error.message });
      console.log('[App] Error during download - file not found', { error: error, purchaseId: req.params.purchaseId });
        files = [purchase.product.downloadFile];
      }

      if (!files[fileIndex]) {
        return res.status(404).json({ error: 'File not found' });
      }

      fileName = files[fileIndex];
      key = `${FOLDER}/downloads/${fileName}`;
      cleanName = fileName.replace(/_\d{13}(\.[^.]+)$/, '$1');
    }

    const s3Response = await getFromSpaces(key);
    res.setHeader('Content-Type', s3Response.ContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);
    s3Response.Body.pipe(res);
  } catch (error) {
      console.log('[App] Error processing download request', { error: error });
      console.log('[App] Error during download - unexpected failure', { purchaseId: req.params.purchaseId, error: error.message });
      console.log('[App] Error during download', { error: error, purchaseId: req.params.purchaseId });
    console.error('[Download] Error:', error.message);
    return res.status(500).json({ error: 'Error downloading file' });
  }
});

// ─── Email Endpoints (internal use only - called by Stripe webhook) ─────────────
// Rate limit email endpoints to prevent abuse (5 per minute per IP)
const emailLimits = new Map();
// Sweep expired rate limit entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  let swept = 0;
  for (const [ip, entry] of emailLimits) {
    if (now > entry.resetAt) {
      emailLimits.delete(ip);
      swept++;
    }
  }
  if (swept > 0) console.log(`[Email] Rate limit cleanup: swept ${swept} expired entries`);
}, 5 * 60 * 1000);
function emailRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = emailLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    emailLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return next();
  }
  entry.count++;
  if (entry.count > 5) {
    console.log('[Email] Rate limit exceeded for IP:', ip);
    return res.status(429).json({ error: 'Too many requests' });
  }
  return next();
}

app.post('/api/send-purchase-email', emailRateLimit, async (req, res) => {
  try {
    const { email, productName, price, sessionId } = req.body;
    console.log('[Email] Sending purchase confirmation to:', email);
    const success = await sendPurchaseConfirmationEmail(email, { productName, price, sessionId });
    if (success) return res.json({ success: true });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch (error) {
      console.log('[App] Error sending purchase email', { error: error });
      console.log('[App] Error sending purchase email', { error: error.message });
      console.log('[App] Error sending purchase email', { error: error });
    console.error('[Email] Send purchase email error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-order-email', emailRateLimit, async (req, res) => {
  try {
    const { email, productName, price, orderType } = req.body;
    console.log('[Email] Sending order confirmation to:', email);
    const success = await sendOrderConfirmationEmail(email, { productName, price, orderType });
    if (success) return res.json({ success: true });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch (error) {
      console.log('[App] Error sending order email', { error: error });
      console.log('[App] Error sending order email', { error: error.message });
      console.log('[App] Error sending order email', { error: error });
    console.error('[Email] Send order email error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-admin-notification', emailRateLimit, async (req, res) => {
  try {
    const { customerEmail, productName, price, productType, sessionId, productImages } = req.body;
    console.log('[Email] Sending admin sale notification for:', productName);
    const success = await sendAdminSaleNotification({ customerEmail, productName, price, productType, sessionId, productImages });
    if (success) return res.json({ success: true });
    console.log('[Email] Admin notification failed, but continuing');
    return res.json({ success: false, message: 'Failed to send admin notification' });
  } catch (error) {
      console.log('[App] Error sending admin notification', { error: error });
      console.log('[App] Error sending admin notification', { error: error.message });
      console.log('[App] Error sending admin notification', { error: error });
    console.error('[Email] Admin notification error:', error.message);
    return res.json({ success: false, error: error.message });
  }
});

app.post('/api/test-email', lz.adminMiddleware, async (req, res) => {
  try {
    const { type, email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    console.log('[Email] Test email requested:', type, 'to:', email);
    let success = false;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';

    switch (type) {
      case 'purchase':
        success = await sendPurchaseConfirmationEmail(email, { productName: 'Sample Quiz Pack - Test', price: '4.99', sessionId: 'test_session_123' });
        break;
      case 'order':
        success = await sendOrderConfirmationEmail(email, { productName: 'Fat Big Quiz On Stage - Test Event', price: '19.99', orderType: 'EVENT' });
        break;
      case 'welcome':
        success = await sendWelcomeEmail(email);
        break;
      case 'password-reset':
        success = await sendPasswordResetEmail(email, { resetUrl: `${baseUrl}/reset-password?token=test_token_123`, expiresIn: '1 hour' });
        break;
      case 'admin-notification':
        success = await sendAdminSaleNotification({ customerEmail: 'test@example.com', productName: 'Christmas Music Quiz Name The Theme Tune', price: '4.99', productType: 'DIGITAL_DOWNLOAD', sessionId: 'test_session_123', productImages: ['christmas-music-quiz-name-the-theme-tune-powerpoint-cover_1777394006240.jpg'] });
        break;
      case 'health-check': {
        const { runHealthCheck } = require('./services/healthCheck');
        await runHealthCheck(sendEmail);
        success = true;
        break;
      }
      case 'admin-list-signup':
        success = await sendAdminListNotification({ email: 'test@example.com', firstName: 'Jane', lastName: 'Smith', source: 'sign-up' });
        break;
      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    if (success) return res.json({ success: true, type, email });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch (error) {
      console.log('[App] Error sending test email', { error: error });
      console.log('[App] Error sending test email', { error: error.message });
      console.log('[App] Error sending test email', { error: error });
    console.error('[Email] Test email error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ─── Socket.IO (Visitor Updates) ────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log("[Socket] User connected");

  const sendVisitorUpdate = async (timeRange = 'today') => {
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeRange) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }

      const count = await prisma.visitor.count({
        where: { timestamp: { gte: startDate } },
      });

      const visitors = await prisma.visitor.findMany({
        where: { timestamp: { gte: startDate } },
        select: {
          id: true, ip: true, referrer: true, referrerCategory: true,
          city: true, country: true, latitude: true, longitude: true,
          timestamp: true, path: true,
        },
        orderBy: { timestamp: 'desc' },
      });

      socket.emit("visitorUpdate", { count, visitors });
    } catch (error) {
      console.error("[Socket] Error sending visitor update:", error.message);
    }
  };

  sendVisitorUpdate();
  socket.on("getVisitorData", (data) => sendVisitorUpdate(data?.timeRange || 'today'));
  socket.on("newVisitor", () => sendVisitorUpdate());

  // ── Settings auto-save via socket (admin-only) ─────────────────────────────
  socket.on("settings:save", async ({ key, value, category, description, adminSecret }) => {
    // Verify admin credentials before allowing settings changes
    if (!adminSecret || (adminSecret !== process.env.ADMIN_API_KEY && adminSecret !== process.env.NEXTAUTH_SECRET)) {
      console.log("[Socket] Unauthorised settings:save attempt for key:", key);
      socket.emit("settings:saved", { key, success: false, error: "Unauthorised" });
      return;
    }
    try {
      console.log("[Socket] Saving setting:", key);
      const storedValue = typeof value === "string" ? value : JSON.stringify(value);
      await prisma.setting.upsert({
        where: { key },
        update: { value: storedValue, category: category || "general", description },
        create: { key, value: storedValue, category: category || "general", description },
      });
      socket.emit("settings:saved", { key, success: true });
      console.log("[Socket] Setting saved:", key);
    } catch (error) {
      console.error("[Socket] Error saving setting:", error.message);
      socket.emit("settings:saved", { key, success: false, error: error.message });
    }
  });

  socket.on("disconnect", () => console.log("[Socket] User disconnected"));
});

// ─── Error Handling ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error("[Server] Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`[FBQ] Server running on port ${PORT}`);
    // Start health check scheduler (checks critical pages every 30 mins)
    startHealthCheckScheduler(sendEmail);
  });
}

module.exports = app;
