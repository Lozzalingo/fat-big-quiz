// Fat Big Quiz - Quiz App Module (Containerised)
// Standalone Express service for game sessions with Socket.io
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 7056;
const SERVICE_NAME = 'QuizApp';

const app = express();
app.use(compression());

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['https://fatbigquiz.com', 'https://www.fatbigquiz.com'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true, methods: ['GET', 'POST'] },
});

app.set('io', io);

// Health check
app.get('/health', (req, res) => {
  console.log('[Server] GET /health', { ip: req.ip });
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
  });
});

// Mount module routes (game socket handlers are attached in app.js via @lozzalingo/game-engine)
const { registerRoutes } = require('./server/modules/quiz-app');
registerRoutes(app, {});

// Basic game status endpoint
app.get('/api/game/status', (req, res) => {
  console.log('[Server] GET /api/game/status', { ip: req.ip });
  res.json({ active: true, connections: io.engine.clientsCount });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[${SERVICE_NAME}] Socket connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[${SERVICE_NAME}] Socket disconnected: ${socket.id}`);
  });
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${SERVICE_NAME}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Service running on port ${PORT} (HTTP + WebSocket)`);
});
