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

// Site-specific route imports
const productsRouter = require("./routes/products");
const productImagesRouter = require("./routes/productImages");
const categoryRouter = require("./routes/category");
const searchRouter = require("./routes/search");
const mainImageRouter = require("./routes/mainImages");
const backendImageRouter = require("./routes/backendImages");
const userRouter = require("./routes/users");
const orderRouter = require("./routes/customer_orders");
const slugRouter = require("./routes/slugs");
const orderProductRouter = require('./routes/customer_order_product');
const wishlistRouter = require('./routes/wishlist');
const subscriberRoutes = require('./routes/subscribers');
const blogRouter = require('./routes/blog');
const tagRouter = require('./routes/tags');
const commentRouter = require('./routes/comments');
const imageListRouter = require('./routes/image_list');
const youtubeRoutes = require('./routes/youtube');
const discountCodesRouter = require('./routes/discount-codes');
const settingsRouter = require('./routes/settings');
const visitorRouter = require("./routes/visitors");
const purchasesRouter = require('./routes/purchases');
const quizFormatsRouter = require('./routes/quizFormats');
const homepageCardsRouter = require('./routes/homepageCards');
const globalDownloadFilesRouter = require('./routes/globalDownloadFiles');
let merchantRouter;
try {
  merchantRouter = require('./routes/merchant');
} catch (err) {
  console.warn("[Merchant] Failed to load merchant routes:", err.message);
  merchantRouter = null;
}
const indexingRouter = require('./routes/indexing');
const campaignsRouter = require('./routes/campaigns');
const {
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendAdminSaleNotification,
  sendAdminListNotification
} = require('./services/email');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true, methods: ["GET", "POST"] },
});

app.set('io', io);

// ─── Lozzalingo Core ──────────────────────────────────────────────────────────
// Reads lozzalingo.yaml, registers all shared packages (config, logging, email,
// subscribers, settings, ops, storage, auth, bookings, outreach, calendar,
// orders, merchandise), sets up middleware, CORS, admin auth, health check,
// and wires cross-package hooks (bookings -> outreach + calendar).

const lz = new Lozzalingo(app, prisma);

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

// ─── Site-Specific Routes ───────────────────────────────────────────────────────

app.use("/api/products", productsRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/images", productImagesRouter);
app.use("/api/main-image", mainImageRouter);
app.use("/api/backendimages", backendImageRouter);
app.use("/api/users", userRouter);
app.use("/api/search", searchRouter);
app.use("/api/orders", orderRouter);
app.use('/api/order-product', orderProductRouter);
app.use("/api/slugs", slugRouter);
app.use("/api/wishlist", wishlistRouter);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/blog', blogRouter);
app.use('/api/tags', tagRouter);
app.use('/api/comments', commentRouter);
app.use("/api/list-images", imageListRouter);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/discount-codes', discountCodesRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/visitors', visitorRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/quiz-formats', quizFormatsRouter);
app.use('/api/homepage-cards', homepageCardsRouter);
app.use('/api/global-files', globalDownloadFilesRouter);
app.use('/api/campaigns', lz.adminMiddleware, campaignsRouter);
if (merchantRouter) {
  app.use('/api/merchant', merchantRouter);
} else {
  app.use('/api/merchant', (req, res) => {
    res.status(503).json({ error: 'Google Merchant not configured', configured: false });
  });
}
app.use('/api/indexing', indexingRouter);

// ─── Event Products (events-ui compatible) ──────────────────────────────────────
// Uses @lozzalingo/experiences routes with a Prisma proxy that maps
// prisma.product -> prisma.eventProduct (etc.) to avoid clashing with the
// e-commerce Product model. Mounted at /ev/api so events-ui can use
// apiBase = "${API_BASE}/ev".

const { createExperienceRoutes } = require("@lozzalingo/experiences");

// Proxy Prisma so the experiences controller hits EventProduct tables
const eventPrisma = new Proxy(prisma, {
  get(target, prop) {
    if (prop === "product") return target.eventProduct;
    if (prop === "package") return target.eventPackage;
    if (prop === "productImage") return target.eventProductImage;
    if (prop === "productSection") return target.eventProductSection;
    // theme and productTheme stay on the shared models
    return target[prop];
  },
});

const eventRoutes = createExperienceRoutes(eventPrisma, {
  authMiddleware: lz.adminMiddleware,
});
app.use("/ev/api", eventRoutes);
console.log("[FBQ] Event experience routes mounted at /ev/api (proxied to EventProduct tables)");

// ─── File Download Route ────────────────────────────────────────────────────────

const { getFromSpaces, getKey, FOLDER } = require('./utils/spaces');

app.get('/api/download/:purchaseId/:token', async (req, res) => {
  try {
    const { purchaseId, token } = req.params;
    const fileIndex = parseInt(req.query.file) || 0;
    const isGlobal = req.query.global === '1';

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: { product: { select: { downloadFile: true, title: true } } },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
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
    console.error('[Download] Error:', error.message);
    return res.status(500).json({ error: 'Error downloading file' });
  }
});

// ─── Email Endpoints ────────────────────────────────────────────────────────────

app.post('/api/send-purchase-email', async (req, res) => {
  try {
    const { email, productName, price, sessionId } = req.body;
    console.log('[Email] Sending purchase confirmation to:', email);
    const success = await sendPurchaseConfirmationEmail(email, { productName, price, sessionId });
    if (success) return res.json({ success: true });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch (error) {
    console.error('[Email] Send purchase email error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-order-email', async (req, res) => {
  try {
    const { email, productName, price, orderType } = req.body;
    console.log('[Email] Sending order confirmation to:', email);
    const success = await sendOrderConfirmationEmail(email, { productName, price, orderType });
    if (success) return res.json({ success: true });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch (error) {
    console.error('[Email] Send order email error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-admin-notification', async (req, res) => {
  try {
    const { customerEmail, productName, price, productType, sessionId } = req.body;
    console.log('[Email] Sending admin sale notification for:', productName);
    const success = await sendAdminSaleNotification({ customerEmail, productName, price, productType, sessionId });
    if (success) return res.json({ success: true });
    console.log('[Email] Admin notification failed, but continuing');
    return res.json({ success: false, message: 'Failed to send admin notification' });
  } catch (error) {
    console.error('[Email] Admin notification error:', error.message);
    return res.json({ success: false, error: error.message });
  }
});

app.post('/api/test-email', async (req, res) => {
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
        success = await sendAdminSaleNotification({ customerEmail: 'test@example.com', productName: 'Test Quiz Pack', price: '4.99', productType: 'DIGITAL_DOWNLOAD', sessionId: 'test_session_123' });
        break;
      case 'admin-list-signup':
        success = await sendAdminListNotification({ email: 'test@example.com', firstName: 'Jane', lastName: 'Smith', source: 'sign-up' });
        break;
      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    if (success) return res.json({ success: true, type, email });
    return res.status(500).json({ error: 'Failed to send email' });
  } catch (error) {
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
  });
}

module.exports = app;
