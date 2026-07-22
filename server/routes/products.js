const express = require("express");

const router = express.Router();
const {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductById,
  duplicateProduct,
  reorderProducts,
  getEmbedProducts,
  getParentProducts,
  getVariantsByParent,
} = require("../controllers/products");

// Public read routes (storefront)
router.get("/", getAllProducts);
router.get("/parents", getParentProducts);
router.get("/parent/:parentId/variants", getVariantsByParent);
router.get("/embed", getEmbedProducts);
router.get("/:id", getProductById);

// Admin write routes (requires adminMiddleware applied at mount point in app.js)
// These are protected by a separate admin-only router merged below
const adminRouter = express.Router();
adminRouter.post("/", createProduct);
adminRouter.put("/reorder", reorderProducts);
adminRouter.post("/:id/duplicate", duplicateProduct);
adminRouter.put("/:id", updateProduct);
adminRouter.delete("/:id", deleteProduct);

// Export both routers for split mounting
router.adminRouter = adminRouter;
module.exports = router;
