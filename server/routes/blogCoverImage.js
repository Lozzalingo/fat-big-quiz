const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/cover-images'); // Make sure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif|webp/;
    const mimeType = fileTypes.test(file.mimetype);
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimeType && extname) {
      return cb(null, true);
    }
    cb(new Error('Error: Images Only!'));
  }
}).single('uploadedFile');

// Handle upload
router.post('/', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message });
    } else {
      if (!req.file) {
        res.status(400).json({ error: 'No file selected' });
      } else {
        res.json({ 
          success: true,
          filename: req.file.filename,
          path: `/uploads/cover-images/${req.file.filename}`
        });
      }
    }
  });
});

module.exports = router;