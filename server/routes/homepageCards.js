const express = require("express");

const router = express.Router();

const {
  getPublicHomepageCards,
  getAllHomepageCards,
  getHomepageCardById,
  createHomepageCard,
  updateHomepageCard,
  deleteHomepageCard,
  uploadHomepageCardImage,
  removeHomepageCardImage,
  reorderHomepageCards,
} = require("../controllers/homepageCards");

// Public route for frontend
router.route("/public").get(getPublicHomepageCards);

// Admin routes
router.route("/").get(getAllHomepageCards).post(createHomepageCard);
router.route("/reorder").put(reorderHomepageCards);

router
  .route("/:id")
  .get(getHomepageCardById)
  .put(updateHomepageCard)
  .delete(deleteHomepageCard);

// Image management
router.route("/:id/image").post(uploadHomepageCardImage).delete(removeHomepageCardImage);

module.exports = router;
