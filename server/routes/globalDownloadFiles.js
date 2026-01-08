const express = require("express");
const multer = require("multer");
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

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow PDFs and common document types
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/zip",
      "application/x-zip-compressed",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, images, and ZIP files are allowed"));
    }
  },
});

// Routes
router.route("/").get(getAllGlobalFiles).post(createGlobalFile);
router.route("/active").get(getActiveGlobalFiles);
router.route("/reorder").put(reorderGlobalFiles);
router.route("/:id").get(getGlobalFileById).put(updateGlobalFile).delete(deleteGlobalFile);
router.route("/:id/upload").post(upload.single("uploadedFile"), uploadGlobalFile);

module.exports = router;
