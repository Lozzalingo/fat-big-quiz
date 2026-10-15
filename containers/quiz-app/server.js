// Fat Big Quiz - Quiz App (Standalone Game Engine)
// Fully self-contained: runs independently of the main FBQ backend.
// Provides real-time quiz gameplay via Socket.io + REST API for game management.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const { attachGameHandlers } = require('@lozzalingo/game-engine/server');

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

// ── Game Engine ─────────────────────────────────────────────────────────────
// attachGameHandlers wires up the /game Socket.io namespace with all game
// logic: create, join, start, answer, next round, end, disconnect handling.
// Game state is held in-memory (no database required).

const { games, gameNamespace } = attachGameHandlers(io, {
  onGameEnd: (game) => {
    const winner = game.getLeaderboard()[0];
    console.log(`[${SERVICE_NAME}] Game ${game.gameCode} ended. Winner: ${winner?.name || 'N/A'} (${winner?.score || 0} pts)`);
  },
});

// ── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    standalone: true,
    timestamp: new Date().toISOString(),
    connections: io.engine.clientsCount,
    activeGames: games.size,
  });
});

// ── Game REST API ───────────────────────────────────────────────────────────
// These endpoints let external services query game state without a socket.

// List all active games (summary only, no player details)
app.get('/api/games', (req, res) => {
  console.log(`[${SERVICE_NAME}] GET /api/games`);
  const gameList = [];
  for (const [code, game] of games) {
    gameList.push({
      gameCode: code,
      mode: game.mode,
      phase: game.phase,
      playerCount: Object.keys(game.players).length,
      currentRound: game.currentRound,
      totalRounds: game.totalRounds,
      startedAt: game.startedAt,
    });
  }
  res.json({ games: gameList, count: gameList.length });
});

// Get details for a specific game
app.get('/api/games/:gameCode', (req, res) => {
  const game = games.get(req.params.gameCode.toUpperCase());
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  console.log(`[${SERVICE_NAME}] GET /api/games/${req.params.gameCode}`);
  res.json({
    gameCode: game.gameCode,
    mode: game.mode,
    phase: game.phase,
    config: game.config,
    playerCount: Object.keys(game.players).length,
    players: Object.values(game.players).map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: p.connected,
    })),
    currentRound: game.currentRound,
    totalRounds: game.totalRounds,
    leaderboard: game.getLeaderboard(),
    startedAt: game.startedAt,
  });
});

// Quick game status check (lightweight, for the frontend join page)
app.get('/api/games/:gameCode/exists', (req, res) => {
  const game = games.get(req.params.gameCode.toUpperCase());
  if (!game) {
    return res.json({ exists: false });
  }
  res.json({
    exists: true,
    phase: game.phase,
    playerCount: Object.keys(game.players).length,
    joinable: game.phase === 'LOBBY' || game.config.allowLateJoin,
  });
});

// Overall service status
app.get('/api/game/status', (req, res) => {
  console.log(`[${SERVICE_NAME}] GET /api/game/status`);
  res.json({
    active: true,
    standalone: true,
    connections: io.engine.clientsCount,
    activeGames: games.size,
  });
});

// ── Mount module routes (future quiz-app-specific routes) ───────────────────

const { registerRoutes } = require('./server/modules/quiz-app');
registerRoutes(app, { games, gameNamespace, io });

// ── Request Logging ─────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${SERVICE_NAME}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ── Start Server ────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[${SERVICE_NAME}] Standalone game engine running on port ${PORT} (HTTP + WebSocket)`);
  console.log(`[${SERVICE_NAME}] Socket.io /game namespace ready for connections`);
  console.log(`[${SERVICE_NAME}] REST API available at /api/games, /api/game/status`);
});
