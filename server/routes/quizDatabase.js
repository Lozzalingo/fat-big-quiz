const express = require("express");
const router = express.Router();

const {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getStats,
  importQuestions,
  bulkUpdateStatus,
  getCategories,
  getCountries,
  getThemes,
  getSources,
  getSubCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createTheme,
  deleteTheme,
  submitFeedback,
  getBatchFeedback,
  luckyDip,
  getQuestionsByIds,
} = require("../controllers/quizDatabase");

// ─── Public routes ──────────────────────────────────────────────────────────

router.get("/", getAllQuestions);
router.get("/stats", getStats);
router.get("/categories", getCategories);
router.get("/sub-categories", getSubCategories);
router.get("/countries", getCountries);
router.get("/themes", getThemes);
router.get("/sources", getSources);
router.get("/lucky-dip", luckyDip);
router.post("/by-ids", getQuestionsByIds);
router.post("/feedback/batch", getBatchFeedback);
router.get("/:id", getQuestionById);
router.post("/:id/feedback", submitFeedback);

// ─── Admin routes (protected via app.js middleware) ─────────────────────────

router.post("/", createQuestion);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);
router.post("/import", importQuestions);
router.post("/bulk-status", bulkUpdateStatus);

// Lookup table management
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);
router.post("/themes", createTheme);
router.delete("/themes/:id", deleteTheme);

module.exports = router;
