// Quiz Pack module - subscription billing
// Subscription routes are handled by @lozzalingo/core (Stripe integration).
// This module is a placeholder for any future quiz-pack-specific billing routes.

function registerRoutes(/* app, options */) {
  // Currently no site-specific subscription routes.
  // Stripe webhook and subscription management are handled by the core orchestrator.
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['payments', 'auth'];
