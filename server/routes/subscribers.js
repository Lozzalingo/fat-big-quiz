const express = require('express');
const { validate } = require('../middleware/validate');
const { subscriberCreate, subscriberUnsubscribe } = require('../middleware/schemas');
const router = express.Router();

const {
  createSubscriber,
  getAllSubscribers,
  getSubscriberByEmail,
  deleteSubscriber,
  updateSubscriberByEmail,
  deleteSubscriberByEmail,
  unsubscribe,
  confirmSubscription,
} = require('../controllers/subscribers');

// Simple rate limiter for subscribe endpoint (10 per minute per IP)
const subscribeLimits = new Map();
function subscribeRateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = subscribeLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    subscribeLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return next();
  }
  entry.count++;
  if (entry.count > 10) {
    console.log('[Subscriber] Rate limit exceeded for:', ip);
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
}

router.route('/')
  .post(subscribeRateLimit, validate(subscriberCreate), createSubscriber)
  .get(getAllSubscribers);

router.post('/unsubscribe', subscribeRateLimit, validate(subscriberUnsubscribe), unsubscribe);
router.post('/confirm', confirmSubscription);

router.route('/:id')
  .delete(deleteSubscriber);

router.route('/:email')
  .get(getSubscriberByEmail)
  .delete(deleteSubscriberByEmail)
  .put(updateSubscriberByEmail)


module.exports = router;