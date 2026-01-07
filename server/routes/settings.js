const express = require("express");
const router = express.Router();
const { getSettings, updateSettings } = require("../controllers/settings");

// GET /api/settings?userId=<userId> - Fetch settings for a user
router.get("/", getSettings);

// POST /api/settings?userId=<userId> - Update settings for a user
router.post("/", updateSettings);

module.exports = router;