const express = require("express");
const router = express.Router();
const {
  receiveEtsyWebhook,
  createWebsiteSale,
  getAllSales,
  getSaleById,
  getSalesStats,
} = require("../controllers/sales");

// ─── Ticker Key Middleware (for laurence.computer agent) ────────────────────

function tickerKeyAuth(req, res, next) {
  const tickerKey = process.env.TICKER_API_KEY;
  if (!tickerKey || req.headers["x-ticker-key"] !== tickerKey) {
    return res.status(401).json({ error: "Unauthorised" });
  }
  next();
}

// ─── Authenticated Routes ───────────────────────────────────────────────────

// Etsy webhook (authenticated by x-webhook-key header)
router.post("/etsy-webhook", receiveEtsyWebhook);

// Website sale creation (authenticated by x-webhook-key or x-ticker-key)
router.post("/", createWebsiteSale);

// Ticker-key authenticated read routes (for laurence.computer agent)
router.get("/external/stats", tickerKeyAuth, getSalesStats);
router.get("/external", tickerKeyAuth, getAllSales);
router.get("/external/:id", tickerKeyAuth, getSaleById);

// ─── Admin Routes (behind lz.adminMiddleware in app.js) ─────────────────────

const adminRouter = express.Router();
adminRouter.get("/stats", getSalesStats);
adminRouter.get("/", getAllSales);
adminRouter.get("/:id", getSaleById);

router.adminRouter = adminRouter;

module.exports = router;
