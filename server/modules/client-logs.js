/**
 * Client Logs Module - Fat Big Quiz
 *
 * Receives client-side error reports from the browser.
 * Migrated from Next.js API route (app/api/logs/client/route.ts) to Express.
 *
 * Routes:
 *   POST /api/logs/client - Log a client-side error
 */

function registerRoutes(app) {

  app.post('/api/logs/client', (req, res) => {
    try {
      console.error('[ClientError]', JSON.stringify(req.body));
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: true });
    }
  });

  console.log('[FBQ] Client logs module registered');
}

module.exports = { registerRoutes };
