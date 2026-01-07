// app.js
require('dotenv').config({ path: require('path').join(__dirname, './.env') });

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
const {
  sendPurchaseConfirmationEmail,
  sendOrderConfirmationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail
} = require('./services/email');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Make io accessible to route handlers
app.set('io', io);

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(fileUpload());

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

// File download route - streams file from S3 to user
const { getFromSpaces, getKey, FOLDER } = require('./utils/spaces');
const crypto = require('crypto');

app.get('/api/download/:purchaseId/:token', async (req, res) => {
  try {
    const { purchaseId, token } = req.params;
    const fileIndex = parseInt(req.query.file) || 0;

    // Get purchase to verify and find file
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

    // Parse download files
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

    const fileName = files[fileIndex];
    const key = `${FOLDER}/downloads/${fileName}`;

    // Get file from S3
    const s3Response = await getFromSpaces(key);

    // Clean filename for download
    const cleanName = fileName.replace(/_\d{13}(\.[^.]+)$/, '$1');

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

  const sendVisitorUpdate = async () => {
    try {
      // Create a Date object for the start of today
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const count = await prisma.visitor.count({
        where: { timestamp: { gte: startOfToday } },
      });
      
      const visitors = await prisma.visitor.findMany({
        where: { timestamp: { gte: startOfToday } },
        select: {
          ip: true,
          referrer: true,
          referrerCategory: true,
          city: true,
          country: true,
          latitude: true,
          longitude: true,
          timestamp: true, // Added timestamp for sorting/displaying most recent
          path: true, // Include the path they visited
        },
        orderBy: {
          timestamp: 'desc', // Sort by most recent first
        },
      });
      
      socket.emit("visitorUpdate", { count, visitors });
    } catch (error) {
      console.error("Error sending visitor update:", error);
    }
  };

  sendVisitorUpdate();

  socket.on("newVisitor", sendVisitorUpdate);

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