/**
 * Visitor Analytics Routes
 * Comprehensive analytics API endpoints
 */
const express = require("express");
const router = express.Router();
const visitorController = require("../controllers/visitors");

// Tracking endpoints
router.post("/track", visitorController.trackView);
router.post("/update", visitorController.updateVisitor);
router.post("/event", visitorController.trackEvent);

// Analytics data endpoints
router.get("/change", visitorController.getVisitorChange);
router.get("/overview", visitorController.getOverviewStats);
router.get("/devices", visitorController.getDeviceStats);
router.get("/geographic", visitorController.getGeographicStats);
router.get("/timeline", visitorController.getTrafficTimeline);
router.get("/referrers", visitorController.getReferrerStats);
router.get("/pages", visitorController.getTopPages);
router.get("/ecommerce", visitorController.getEcommerceFunnel);
router.get("/activity", visitorController.getRecentActivity);
router.get("/bots", visitorController.getBotStats);
router.get("/interactions", visitorController.getInteractionStats);

module.exports = router;
