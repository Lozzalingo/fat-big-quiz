// Quiz App module - standalone game management routes
// Game socket handlers are attached via @lozzalingo/game-engine in server.js.
// This module provides additional REST endpoints for the quiz-app container.

/**
 * @param {import('express').Express} app
 * @param {Object} options - { games, gameNamespace, io }
 */
function registerRoutes(app, options = {}) {
  const { games, gameNamespace } = options;

  // Leaderboard for a specific game (public, no auth required)
  app.get('/api/games/:gameCode/leaderboard', (req, res) => {
    if (!games) return res.status(503).json({ error: 'Game engine not initialised' });

    const game = games.get(req.params.gameCode.toUpperCase());
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`[QuizApp] GET /api/games/${req.params.gameCode}/leaderboard`);
    res.json({
      gameCode: game.gameCode,
      phase: game.phase,
      leaderboard: game.getLeaderboard(),
    });
  });

  // Force-end a game (admin only, requires x-admin-key header)
  app.post('/api/games/:gameCode/end', (req, res) => {
    if (!games || !gameNamespace) {
      return res.status(503).json({ error: 'Game engine not initialised' });
    }

    // Simple admin key check (optional, skipped if ADMIN_API_KEY not set)
    const adminKey = process.env.ADMIN_API_KEY;
    if (adminKey && req.headers['x-admin-key'] !== adminKey) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const code = req.params.gameCode.toUpperCase();
    const game = games.get(code);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`[QuizApp] Admin force-ending game ${code}`);
    const result = game.endGame();
    gameNamespace.to(code).emit('game:results', result);
    games.delete(code);

    res.json({ success: true, result });
  });
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = [];
