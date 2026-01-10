const express = require("express");
const router = express.Router();
const googleIndexing = require("../services/googleIndexing");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Check if Google Indexing is configured
router.get("/status", async (req, res) => {
  try {
    const configured = googleIndexing.isConfigured();
    res.json({
      configured,
      message: configured
        ? "Google Indexing API is configured"
        : "Google service account key not found. Place it at server/config/google-service-account.json",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit a single URL for indexing
router.post("/submit", async (req, res) => {
  try {
    const { url, type = "URL_UPDATED" } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    if (!["URL_UPDATED", "URL_DELETED"].includes(type)) {
      return res.status(400).json({ error: "Type must be URL_UPDATED or URL_DELETED" });
    }

    const result = await googleIndexing.submitUrl(url, type);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit multiple URLs for indexing
router.post("/submit-batch", async (req, res) => {
  try {
    const { urls, type = "URL_UPDATED" } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: "URLs array is required" });
    }

    if (urls.length > 100) {
      return res.status(400).json({ error: "Maximum 100 URLs per batch" });
    }

    const results = await googleIndexing.submitUrls(urls, type);

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      summary: {
        total: urls.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit all site URLs for indexing
router.post("/submit-all", async (req, res) => {
  try {
    const urls = await googleIndexing.getAllSiteUrls(prisma);

    console.log(`[Indexing] Submitting ${urls.length} URLs for indexing...`);

    const results = await googleIndexing.submitUrls(urls, "URL_UPDATED");

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      summary: {
        total: urls.length,
        successful,
        failed,
      },
      results,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get URL status/metadata
router.get("/url-status", async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: "URL query parameter is required" });
    }

    const result = await googleIndexing.getUrlStatus(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all indexable URLs (preview without submitting)
router.get("/urls", async (req, res) => {
  try {
    const urls = await googleIndexing.getAllSiteUrls(prisma);
    res.json({
      count: urls.length,
      urls,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
