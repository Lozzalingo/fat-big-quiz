// Fat Big Quiz - Admin Module (Containerised)
// Standalone Express service for admin dashboard, users, orders, settings, campaigns, visitors
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');

const PORT = process.env.PORT || 7058;
const SERVICE_NAME = 'Admin';

const app = express();
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Admin middleware
function adminMiddleware(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;
  const provided = req.headers['x-admin-key'];
  if (!adminKey || provided !== adminKey) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Cache header helper
function cachePublic(seconds) {
  return (req, res, next) => {
    if (req.method === 'GET') {
      res.set('Cache-Control', `public, max-age=${seconds}`);
    }
    next();
  };
}

// Health check
app.get('/health', (req, res) => {
  console.log('[Server] GET /health', { ip: req.ip });
  res.json({ status: 'ok', service: SERVICE_NAME, timestamp: new Date().toISOString() });
});

// Mount module routes
const { registerRoutes } = require('./server/modules/admin');
registerRoutes(app, { adminMiddleware, cachePublic });

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${SERVICE_NAME}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Service running on port ${PORT}`);
});
