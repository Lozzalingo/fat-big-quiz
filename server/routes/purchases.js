const express = require("express");
const router = express.Router();
const {
  createPurchase,
  getPurchaseById,
  getPurchaseBySessionId,
  getPurchasesByEmail,
  incrementDownload,
} = require("../controllers/purchases");

// Create a new purchase
router.post("/", createPurchase);

// Get purchase by Stripe session ID
router.get("/session/:sessionId", getPurchaseBySessionId);

// Get purchase by ID
router.get("/:purchaseId", getPurchaseById);

// Get all purchases by email
router.get("/email/:email", getPurchasesByEmail);

// Increment download count and get download URL
router.post("/:purchaseId/download", incrementDownload);

module.exports = router;
