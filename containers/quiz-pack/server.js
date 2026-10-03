// Fat Big Quiz - Quiz Pack Module (Containerised)
// Standalone Express service for quiz pack subscription billing
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');

const PORT = process.env.PORT || 7051;
const SERVICE_NAME = 'QuizPack';

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

// Health check
app.get('/health', (req, res) => {
  console.log('[Server] GET /health', { ip: req.ip });
  res.json({ status: 'ok', service: SERVICE_NAME, timestamp: new Date().toISOString() });
});

// Mount module routes (currently a placeholder - Stripe handled by core)
const { registerRoutes } = require('./server/modules/quiz-pack');
registerRoutes(app, {});

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
