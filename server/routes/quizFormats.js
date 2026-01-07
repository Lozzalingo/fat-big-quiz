const express = require("express");

const router = express.Router();

const {
  getAllQuizFormats,
  getQuizFormatById,
  createQuizFormat,
  updateQuizFormat,
  deleteQuizFormat,
  uploadExplainerImage,
  removeExplainerImage,
  reorderExplainerImages,
} = require("../controllers/quizFormats");

router.route("/").get(getAllQuizFormats).post(createQuizFormat);

router
  .route("/:id")
  .get(getQuizFormatById)
  .put(updateQuizFormat)
  .delete(deleteQuizFormat);

// Explainer image management
router.route("/:id/images").post(uploadExplainerImage);
router.route("/:id/images/reorder").put(reorderExplainerImages);
router.route("/:id/images/:index").delete(removeExplainerImage);

module.exports = router;
