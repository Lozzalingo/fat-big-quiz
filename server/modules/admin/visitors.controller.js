/**
 * Visitor Analytics Controller - Proxies to centralised Analytics Service
 *
 * Individual controller methods are not used when routes proxy directly,
 * but this module is kept for backwards compatibility with any code that
 * imports the controller object.
 */

const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL;
const SITE_DOMAIN = 'fatbigquiz.com';

async function fetchFromAnalytics(path, options = {}) {
  if (!ANALYTICS_SERVICE_URL) {
    throw new Error('ANALYTICS_SERVICE_URL not configured');
  }
  const url = new URL(path, ANALYTICS_SERVICE_URL);
  url.searchParams.set('site_domain', SITE_DOMAIN);
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Analytics service returned ${res.status}: ${body}`);
  }
  return res.json();
}

const controller = {
  async getVisitors(req, res) {
    try {
      const data = await fetchFromAnalytics('/api/visitors');
      return res.json(data);
    } catch (error) {
      console.error('[Analytics] Error fetching visitors:', error.message);
      return res.status(502).json({ error: 'Failed to fetch visitors' });
    }
  },

  async getVisitorStats(req, res) {
    try {
      const data = await fetchFromAnalytics('/api/visitors/stats');
      return res.json(data);
    } catch (error) {
      console.error('[Analytics] Error fetching visitor stats:', error.message);
      return res.status(502).json({ error: 'Failed to fetch visitor stats' });
    }
  },
};

module.exports = controller;
