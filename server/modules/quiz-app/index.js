// Quiz App module - game sessions (Socket.io handlers)
// Game handlers are attached via @lozzalingo/game-engine in app.js.
// This module is a placeholder for any future quiz-app-specific routes.

function registerRoutes(/* app, options */) {
  // Game socket handlers are attached directly in app.js via attachGameHandlers().
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['auth'];
