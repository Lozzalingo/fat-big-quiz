const express = require('express');
const router = express.Router();
const { handleCallback } = require('./payments-callback.controller');

// POST /api/payments/callback
// Plain server-to-server POST from Payments service (no auth)
router.post('/callback', handleCallback);

module.exports = router;
