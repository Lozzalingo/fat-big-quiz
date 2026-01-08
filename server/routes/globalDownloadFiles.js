const express = require("express");
const {
  getAllGlobalFiles,
  getActiveGlobalFiles,
  getGlobalFileById,
  createGlobalFile,
  updateGlobalFile,
  deleteGlobalFile,
  uploadGlobalFile,
  reorderGlobalFiles,
} = require("../controllers/globalDownloadFiles");

const router = express.Router();

// Routes
router.route("/").get(getAllGlobalFiles).post(createGlobalFile);
router.route("/active").get(getActiveGlobalFiles);
router.route("/reorder").put(reorderGlobalFiles);
router.route("/:id").get(getGlobalFileById).put(updateGlobalFile).delete(deleteGlobalFile);
router.route("/:id/upload").post(uploadGlobalFile);

module.exports = router;
