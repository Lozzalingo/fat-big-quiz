// Events module - events, bookings, calendar
// Serves EventProduct data at /ev/api/products in the shape @lozzalingo/events-ui
// expects (the frontend EventsProvider uses apiBase = "${API_BASE}/ev").
// The monolith app.js can also proxy /ev/api to a centralised events service via
// EVENTS_SERVICE_URL, but the fbq_events container serves these routes locally
// from the FBQ MySQL database.

const express = require('express');
const {
  getAllProducts,
  getProductBySlug,
  getProductById,
} = require('./eventProducts.controller');

function registerRoutes(app /*, options */) {
  const router = express.Router();

  router.get('/products', getAllProducts);
  router.get('/products/slug/:slug', getProductBySlug);
  router.get('/products/:id', getProductById);

  app.use('/ev/api', router);
  console.log('[Events] Event product routes mounted at /ev/api/products');
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['bookings', 'calendar', 'email', 'auth'];
