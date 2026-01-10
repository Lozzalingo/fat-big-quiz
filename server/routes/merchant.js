/**
 * Google Merchant Center API Routes
 * Endpoints for syncing products to Google Shopping
 */

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const merchantApi = require("../services/merchantApi");
const { formatProductForMerchant, formatProductsForMerchant, validateProduct } = require("../utils/merchantFeed");

const prisma = new PrismaClient();

// Middleware to check if Merchant API is configured
const checkMerchantConfig = (req, res, next) => {
  if (!merchantApi.isConfigured()) {
    return res.status(503).json({
      error: "Google Merchant API not configured",
      message: "Set GOOGLE_MERCHANT_ID and GOOGLE_APPLICATION_CREDENTIALS environment variables",
    });
  }
  next();
};

/**
 * GET /api/merchant/status
 * Check Merchant API configuration and connection status
 */
router.get("/status", async (req, res) => {
  try {
    const configured = merchantApi.isConfigured();

    if (!configured) {
      return res.json({
        configured: false,
        merchantId: null,
        message: "Merchant API not configured",
      });
    }

    // Try to initialize client to verify credentials
    await merchantApi.initClient();

    // Get product count from Merchant Center
    const listResult = await merchantApi.listProducts(1);

    res.json({
      configured: true,
      merchantId: merchantApi.MERCHANT_ID,
      connected: true,
      message: "Merchant API connected successfully",
    });
  } catch (error) {
    res.json({
      configured: merchantApi.isConfigured(),
      merchantId: merchantApi.MERCHANT_ID,
      connected: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/merchant/sync
 * Sync all products to Google Merchant Center
 */
router.post("/sync", checkMerchantConfig, async (req, res) => {
  try {
    // Get all active products with related data
    const products = await prisma.product.findMany({
      where: {
        price: { gt: 0 },
      },
      include: {
        category: true,
        categories: {
          include: {
            category: true,
          },
        },
        quizFormat: true,
        images: true,
      },
    });

    console.log(`[Merchant] Syncing ${products.length} products to Google Merchant Center`);

    // Format products for Merchant API
    const formattedProducts = formatProductsForMerchant(products);

    // Batch upsert all products
    const result = await merchantApi.batchUpsertProducts(formattedProducts);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to sync products",
        message: result.error,
      });
    }

    res.json({
      message: "Products synced to Google Merchant Center",
      totalProducts: products.length,
      synced: result.data.success,
      failed: result.data.failed,
      errors: result.data.errors,
    });
  } catch (error) {
    console.error("[Merchant] Sync error:", error);
    res.status(500).json({ error: "Failed to sync products", message: error.message });
  }
});

/**
 * POST /api/merchant/sync/:productId
 * Sync a single product to Google Merchant Center
 */
router.post("/sync/:productId", checkMerchantConfig, async (req, res) => {
  try {
    const { productId } = req.params;

    // Get the product with related data
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        categories: {
          include: {
            category: true,
          },
        },
        quizFormat: true,
        images: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Validate product
    const validation = validateProduct(product);
    if (!validation.valid) {
      return res.status(400).json({
        error: "Product validation failed",
        errors: validation.errors,
      });
    }

    // Format and upsert
    const formattedProduct = formatProductForMerchant(product);
    const result = await merchantApi.upsertProduct(formattedProduct);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to sync product",
        message: result.error,
      });
    }

    res.json({
      message: "Product synced to Google Merchant Center",
      productId: product.id,
      offerId: formattedProduct.offerId,
    });
  } catch (error) {
    console.error("[Merchant] Single sync error:", error);
    res.status(500).json({ error: "Failed to sync product", message: error.message });
  }
});

/**
 * DELETE /api/merchant/all-products
 * Remove ALL products from Google Merchant Center (uses REST API for reliability)
 */
router.delete("/all-products", checkMerchantConfig, async (req, res) => {
  console.log("[Merchant Route] DELETE /all-products called, grpc param:", req.query.grpc);
  try {
    // Use REST API by default (more reliable, no gRPC encoding issues)
    const useGrpc = req.query.grpc === "true";
    console.log("[Merchant Route] useGrpc:", useGrpc);

    const result = useGrpc
      ? await merchantApi.deleteAllProducts()
      : await merchantApi.deleteAllProductsViaRest();

    console.log("[Merchant Route] Result success:", result.success, "method:", result.method);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to delete products",
        message: result.error,
        method: result.method || (useGrpc ? "gRPC" : "REST"),
      });
    }

    res.json({
      message: "All products deleted from Merchant Center",
      method: result.method || (useGrpc ? "gRPC" : "REST"),
      deleted: result.deleted,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Merchant Route] Delete all error:", error);
    res.status(500).json({ error: "Failed to delete products", message: error.message });
  }
});

/**
 * DELETE /api/merchant/data-sources
 * Delete all data sources (and all products in them)
 * WARNING: This is destructive!
 */
router.delete("/data-sources", checkMerchantConfig, async (req, res) => {
  try {
    console.log("[Merchant Route] DELETE /data-sources called - deleting all data sources");
    const result = await merchantApi.deleteDataSources();

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to delete data sources",
        message: result.error,
      });
    }

    res.json({
      message: "Data sources deleted from Merchant Center",
      deleted: result.deleted,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Merchant Route] Delete data sources error:", error);
    res.status(500).json({ error: "Failed to delete data sources", message: error.message });
  }
});

/**
 * DELETE /api/merchant/kr-products
 * Remove all KR variant products from Google Merchant Center
 */
router.delete("/kr-products", checkMerchantConfig, async (req, res) => {
  try {
    const result = await merchantApi.deleteAllKRProducts();

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to delete KR products",
        message: result.error,
      });
    }

    res.json({
      message: "KR products cleanup complete",
      deleted: result.deleted,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Merchant] KR cleanup error:", error);
    res.status(500).json({ error: "Failed to delete KR products", message: error.message });
  }
});

/**
 * DELETE /api/merchant/product/:productId
 * Remove a product from Google Merchant Center
 */
router.delete("/product/:productId", checkMerchantConfig, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await merchantApi.deleteProduct(productId);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to delete product from Merchant Center",
        message: result.error,
      });
    }

    res.json({
      message: "Product removed from Google Merchant Center",
      productId,
    });
  } catch (error) {
    console.error("[Merchant] Delete error:", error);
    res.status(500).json({ error: "Failed to delete product", message: error.message });
  }
});

/**
 * GET /api/merchant/products
 * List all products in Google Merchant Center
 */
router.get("/products", checkMerchantConfig, async (req, res) => {
  try {
    const result = await merchantApi.listProducts();

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to list products",
        message: result.error,
      });
    }

    res.json({
      count: result.count,
      products: result.data,
    });
  } catch (error) {
    console.error("[Merchant] List error:", error);
    res.status(500).json({ error: "Failed to list products", message: error.message });
  }
});

/**
 * GET /api/merchant/product/:productId/status
 * Get approval status for a product
 */
router.get("/product/:productId/status", checkMerchantConfig, async (req, res) => {
  try {
    const { productId } = req.params;

    const result = await merchantApi.getProductStatus(productId);

    if (!result.success) {
      return res.status(500).json({
        error: "Failed to get product status",
        message: result.error,
      });
    }

    res.json(result.data);
  } catch (error) {
    console.error("[Merchant] Status error:", error);
    res.status(500).json({ error: "Failed to get status", message: error.message });
  }
});

/**
 * GET /api/merchant/feed
 * Generate a JSON feed of all products (for debugging/preview)
 */
router.get("/feed", async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        price: { gt: 0 },
      },
      include: {
        category: true,
        categories: {
          include: {
            category: true,
          },
        },
        quizFormat: true,
        images: true,
      },
    });

    const formattedProducts = formatProductsForMerchant(products);

    res.json({
      count: formattedProducts.length,
      products: formattedProducts,
    });
  } catch (error) {
    console.error("[Merchant] Feed error:", error);
    res.status(500).json({ error: "Failed to generate feed", message: error.message });
  }
});

module.exports = router;
