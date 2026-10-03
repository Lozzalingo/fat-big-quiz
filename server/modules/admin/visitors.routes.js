/**
 * Visitor Analytics Routes - Proxies to centralised Analytics Service
 */
const express = require("express");
const router = express.Router();

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL;
const SITE_DOMAIN = 'fatbigquiz.com';

/**
 * Proxy a request to the Analytics Service, forwarding query params and body.
 */
async function proxyToAnalytics(req, res, path, method = 'GET') {
  if (!ANALYTICS_SERVICE_URL) {
    console.error('[Analytics] ANALYTICS_SERVICE_URL not configured');
    return res.status(503).json({ error: 'Analytics service not configured' });
  }

  try {
    const url = new URL(path, ANALYTICS_SERVICE_URL);
    // Forward query params
    for (const [key, value] of Object.entries(req.query)) {
      url.searchParams.set(key, value);
    }
    // Always include site domain
    url.searchParams.set('site_domain', SITE_DOMAIN);

    const fetchOpts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      fetchOpts.body = JSON.stringify({ ...req.body, site_domain: SITE_DOMAIN });
    }

    const response = await fetch(url.toString(), fetchOpts);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[Analytics] Proxy error:', error.message);
    return res.status(502).json({ error: 'Failed to reach analytics service' });
  }
}

// Visitor list
router.get('/', (req, res) => proxyToAnalytics(req, res, '/api/visitors'));

// Visitor stats / summary
router.get('/stats', (req, res) => proxyToAnalytics(req, res, '/api/visitors/stats'));

// Visitor detail
router.get('/:id', (req, res) => proxyToAnalytics(req, res, `/api/visitors/${req.params.id}`));

// Ingest a visitor event
router.post('/', (req, res) => proxyToAnalytics(req, res, '/api/ingest/visitor', 'POST'));

module.exports = router;
