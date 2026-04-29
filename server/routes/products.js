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

router.route("/").get(getAllProducts).post(createProduct);

router.route("/parents").get(getParentProducts);

router.route("/parent/:parentId/variants").get(getVariantsByParent);

router.route("/embed").get(getEmbedProducts);

router.route("/reorder").put(reorderProducts);

router.route("/:id/duplicate").post(duplicateProduct);

router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

module.exports = router;
