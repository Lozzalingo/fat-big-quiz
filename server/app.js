// app.js
require('dotenv').config({ path: require('path').join(__dirname, './.env') });

// Clear GOOGLE_APPLICATION_CREDENTIALS if the file doesn't exist — prevents SDK crash
const fs = require("fs");
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
  console.warn("[Merchant] Credentials file not found, disabling Google Merchant:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const express = require("express");
const path = require("path");
const bcrypt = require('bcryptjs');
const fileUpload = require("express-fileupload");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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
  sendAdminSaleNotification
} = require('./services/email');

// Shared packages
const { createConfig } = require('@lozzalingo/config/server');
const { createLoggingRoutes, createLoggingService, createClientErrorRoutes } = require('@lozzalingo/logging/server');
const { createEmailService, createEmailRoutes } = require('@lozzalingo/email/server');
const { createSubscriberRoutes } = require('@lozzalingo/subscribers/server');
const { createSettingsRoutes } = require('@lozzalingo/settings/server');
const { createOpsRoutes } = require('@lozzalingo/ops/server');
const { createStorageService, createStorageRoutes } = require('@lozzalingo/storage/server');
const { createAuthRoutes, createAuthMiddleware } = require('@lozzalingo/auth/server');
const { createOrderRoutes } = require('@lozzalingo/orders/server');
const { createMerchandiseRoutes } = require('@lozzalingo/merchandise/server');
const { createCalendarRoutes } = require('@lozzalingo/calendar/routes');
const { createBookingRoutes, createBookingController } = require("@lozzalingo/bookings");
const { createPaymentRoutes } = require("@lozzalingo/payments/routes");
const { createPurchaseRoutes, createPurchaseController } = require("@lozzalingo/purchases");
const { createOutreachService } = require("@lozzalingo/outreach/services/triggers");
const { createOutreachRoutes } = require("@lozzalingo/outreach/routes");
const { processScheduledOutreach } = require("@lozzalingo/outreach/services/scheduler");
const { pencilSlot, blockSlot, releaseSlot, releaseExpiredPencils } = require("@lozzalingo/calendar/services/slots");

// Shared package services
const appConfig = createConfig({ APP_NAME: 'Fat Big Quiz' });
const loggingService = createLoggingService(prisma);
const sharedEmailService = createEmailService({
  brandName: 'Fat Big Quiz',
  style: { primary: '#7c3aed', headerBg: '#7c3aed' },
});
const storageService = createStorageService();
const { rateLimit } = createAuthMiddleware(prisma);

// Outreach service
const outreachEmailService = createEmailService({
  brandName: "Fat Big Quiz",
  fromEmail: process.env.RESEND_FROM_EMAIL,
  replyTo: process.env.RESEND_REPLY_TO,
  websiteUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  adminEmail: process.env.ADMIN_EMAIL,
});

const outreachService = createOutreachService(prisma, outreachEmailService, {
  adminEmail: process.env.ADMIN_EMAIL,
  brandName: "Fat Big Quiz",
  baseUrl: process.env.FRONTEND_URL || "http://localhost:3000",
});

// Booking controller (for programmatic access from webhook)
const bookingController = createBookingController(prisma, {
  modelName: "booking",
  brandPrefix: "FBQ",
  hooks: {
    onCreated: async (booking) => {
      console.log("[FBQ] Booking created:", booking.bookingNumber);
      await outreachService.trigger("booking_created", booking);
    },
    onPaid: async (booking) => {
      console.log("[FBQ] Booking paid:", booking.bookingNumber);
      if (booking.calendarEventId) {
        await blockSlot(prisma, "calendarEvent", booking.calendarEventId, booking.id);
      }
      await outreachService.trigger("booking_paid", booking);
      await outreachService.cancelScheduled(booking.id, "enquiry_followup_3day");
    },
    onCancelled: async (booking) => {
      console.log("[FBQ] Booking cancelled:", booking.bookingNumber);
      if (booking.calendarEventId) {
        await releaseSlot(prisma, "calendarEvent", booking.calendarEventId);
      }
      await outreachService.trigger("booking_cancelled", booking);
      await outreachService.cancelScheduled(booking.id);
    },
  },
});

// Purchase controller
const purchaseController = createPurchaseController(prisma, {
  defaultDownloadLimit: 5,
  defaultExpiryDays: 7,
  hooks: {
    getDownloadUrl: async (purchase) => {
      const product = await prisma.product.findUnique({ where: { id: purchase.productId } });
      return product ? product.downloadFile : null;
    },
    onPurchaseCreated: async (purchase) => {
      console.log("[FBQ] Purchase created:", purchase.id);
      await outreachService.trigger("purchase_completed", purchase);
    },
  },
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Make io accessible to route handlers
app.set('io', io);

// Game engine socket handlers
const { attachGameHandlers } = require('@lozzalingo/game-engine/server');
attachGameHandlers(io, {
  onGameEnd: (game) => {
    console.log(`[GameSocket] Game ${game.gameCode} ended. Winner: ${game.getLeaderboard()[0]?.name || 'N/A'}`);
  },
});

app.use(express.json());
app.use(
  cors({
    origin: true, // Reflect request origin (supports credentials)
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  })
);
app.use(fileUpload());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Skip noisy static file requests
    if (req.originalUrl.startsWith('/server/images') || req.originalUrl.startsWith('/uploads')) return;
    console.log(`[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);

    // Auto-log 5xx errors to database
    if (res.statusCode >= 500) {
      loggingService.error('Request', `${req.method} ${req.originalUrl} ${res.statusCode}`, {
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

// Serve static files
app.use("/server/images", express.static(path.join(__dirname, "images")));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Routes
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
app.use('/api/campaigns', requireAdminKey, campaignsRouter);
if (merchantRouter) {
  app.use('/api/merchant', merchantRouter);
} else {
  // Merchant routes unavailable — return 503 for any merchant API calls
  app.use('/api/merchant', (req, res) => {
    res.status(503).json({ error: 'Google Merchant not configured', configured: false });
  });
}
app.use('/api/indexing', indexingRouter);

// Admin API key middleware — protects admin-only Express routes
// Key is checked via x-admin-key header or ?adminKey query param
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || process.env.NEXTAUTH_SECRET;
function requireAdminKey(req, res, next) {
  const key = req.headers['x-admin-key'] || req.query.adminKey;
  if (!ADMIN_API_KEY || key !== ADMIN_API_KEY) {
    console.log('[Auth] Admin API access denied:', req.method, req.originalUrl);
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Shared package routes — admin-protected
app.use('/api/logs', requireAdminKey, createLoggingRoutes(prisma));
app.use('/api/logs/client', createClientErrorRoutes(prisma));
app.use('/api/emails', requireAdminKey, createEmailRoutes(sharedEmailService, prisma));
app.use('/api/app-settings', requireAdminKey, createSettingsRoutes(prisma, { secretKey: process.env.NEXTAUTH_SECRET }));
app.use('/api/ops', requireAdminKey, createOpsRoutes(prisma));
app.use('/api/storage', requireAdminKey, createStorageRoutes(storageService));

// Shared package routes — public
app.use('/api/shared-subscribers', createSubscriberRoutes(prisma));
app.use('/api/shared-auth', createAuthRoutes(prisma, sharedEmailService));
app.use('/api/calendar', createCalendarRoutes(prisma, { domain: 'fatbigquiz.com', calendarName: 'Fat Big Quiz Events' }));
app.use('/api/shared-orders', requireAdminKey, createOrderRoutes(prisma));
app.use('/api/shared-products', requireAdminKey, createMerchandiseRoutes(prisma, storageService, { modelName: 'merchProduct' }));

// New booking routes (@lozzalingo/bookings)
app.use("/api/bookings-new", createBookingRoutes(prisma, {
  modelName: "booking",
  brandPrefix: "FBQ",
  authMiddleware: requireAdminKey,
}));

// New purchase routes (@lozzalingo/purchases) - alongside existing /api/purchases
app.use("/api/purchases-new", createPurchaseRoutes(prisma, {
  authMiddleware: requireAdminKey,
}));

// Outreach admin routes (@lozzalingo/outreach)
app.use("/api/outreach", createOutreachRoutes(prisma, {
  authMiddleware: requireAdminKey,
}));

// File download route - streams file from S3 to user
const { getFromSpaces, getKey, FOLDER } = require('./utils/spaces');
const crypto = require('crypto');

app.get('/api/download/:purchaseId/:token', async (req, res) => {
  try {
    const { purchaseId, token } = req.params;
    const fileIndex = parseInt(req.query.file) || 0;
    const isGlobal = req.query.global === '1';

    // Get purchase to verify
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        product: {
          select: {
            downloadFile: true,
            title: true,
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // Check if expired (for guest purchases)
    if (purchase.expiresAt && new Date(purchase.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'Download link expired' });
    }

    let fileName, key, cleanName;

    if (isGlobal) {
      // Global bonus file - fetch from database and use global-bonus folder
      const globalFiles = await prisma.globalDownloadFile.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });

      // Parse product files to calculate correct global file index
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
      // Product file - use downloads folder
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

    // Get file from S3
    const s3Response = await getFromSpaces(key);

    // Set headers for download
    res.setHeader('Content-Type', s3Response.ContentType || 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cleanName}"`);

    // Stream file to response
    s3Response.Body.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Error downloading file' });
  }
});

// Send purchase confirmation email (called by webhook)
app.post('/api/send-purchase-email', async (req, res) => {
  try {
    const { email, productName, price, sessionId } = req.body;
    const success = await sendPurchaseConfirmationEmail(email, {
      productName,
      price,
      sessionId,
    });
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Send purchase email error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send order confirmation email (called by webhook)
app.post('/api/send-order-email', async (req, res) => {
  try {
    const { email, productName, price, orderType } = req.body;
    const success = await sendOrderConfirmationEmail(email, {
      productName,
      price,
      orderType,
    });
    if (success) {
      return res.json({ success: true });
    } else {
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Send order email error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Send admin notification for new sales (called by webhook)
app.post('/api/send-admin-notification', async (req, res) => {
  try {
    const { customerEmail, productName, price, productType, sessionId } = req.body;
    const success = await sendAdminSaleNotification({
      customerEmail,
      productName,
      price,
      productType,
      sessionId,
    });
    if (success) {
      return res.json({ success: true });
    } else {
      console.log('[Admin Notification] Failed to send, but continuing');
      return res.json({ success: false, message: 'Failed to send admin notification' });
    }
  } catch (error) {
    console.error('Send admin notification error:', error);
    // Don't fail the sale if admin notification fails
    return res.json({ success: false, error: error.message });
  }
});

// Test email endpoint
app.post('/api/test-email', async (req, res) => {
  try {
    const { type, email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let success = false;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3002';

    switch (type) {
      case 'purchase':
        success = await sendPurchaseConfirmationEmail(email, {
          productName: 'Sample Quiz Pack - Test',
          price: '4.99',
          sessionId: 'test_session_123',
        });
        break;
      case 'order':
        success = await sendOrderConfirmationEmail(email, {
          productName: 'Fat Big Quiz On Stage - Test Event',
          price: '19.99',
          orderType: 'EVENT',
        });
        break;
      case 'welcome':
        success = await sendWelcomeEmail(email);
        break;
      case 'password-reset':
        success = await sendPasswordResetEmail(email, {
          resetUrl: `${baseUrl}/reset-password?token=test_token_123`,
          expiresIn: '1 hour',
        });
        break;
      case 'admin-notification':
        success = await sendAdminSaleNotification({
          customerEmail: 'test@example.com',
          productName: 'Test Quiz Pack',
          price: '4.99',
          productType: 'DIGITAL_DOWNLOAD',
          sessionId: 'test_session_123',
        });
        break;
      default:
        return res.status(400).json({ error: 'Invalid email type' });
    }

    if (success) {
      return res.json({ success: true, type, email });
    } else {
      return res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Socket.IO visitor updates
io.on("connection", (socket) => {
  console.log("A user connected");

  const sendVisitorUpdate = async (timeRange = 'today') => {
    try {
      // Calculate date range based on timeRange parameter
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
        case 'today':
        default:
          startDate.setHours(0, 0, 0, 0);
          break;
      }

      const count = await prisma.visitor.count({
        where: { timestamp: { gte: startDate } },
      });

      const visitors = await prisma.visitor.findMany({
        where: { timestamp: { gte: startDate } },
        select: {
          id: true,
          ip: true,
          referrer: true,
          referrerCategory: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true,
          timestamp: true,
          path: true,
        },
        orderBy: {
          timestamp: 'desc',
        },
      });

      socket.emit("visitorUpdate", { count, visitors });
    } catch (error) {
      console.error("Error sending visitor update:", error);
    }
  };

  // Send initial data
  sendVisitorUpdate();

  // Handle getVisitorData requests from client
  socket.on("getVisitorData", (data) => {
    const timeRange = data?.timeRange || 'today';
    sendVisitorUpdate(timeRange);
  });

  socket.on("newVisitor", () => sendVisitorUpdate());

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});