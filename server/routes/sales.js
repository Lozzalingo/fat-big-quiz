const express = require("express");
const router = express.Router();
const {
  receiveEtsyWebhook,
  createWebsiteSale,
  getAllSales,
  getSaleById,
  getSalesStats,
} = require("../controllers/sales");

// ─── Public / Webhook Routes ────────────────────────────────────────────────

// Etsy webhook (authenticated by x-webhook-key header, not admin middleware)
router.post("/etsy-webhook", receiveEtsyWebhook);

// Website sale creation (called by checkout route)
router.post("/", createWebsiteSale);

// ─── Admin Routes ───────────────────────────────────────────────────────────

const adminRouter = express.Router();
adminRouter.get("/stats", getSalesStats);
adminRouter.get("/", getAllSales);
adminRouter.get("/:id", getSaleById);

router.adminRouter = adminRouter;

module.exports = router;
