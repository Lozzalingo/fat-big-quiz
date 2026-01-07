// routes/youtube.js
const express = require('express');
const router = express.Router();
const { processYoutubeVideo, previewYoutubeVideo } = require('../controllers/youtubeProcessor');

// Process a YouTube video and create a blog post
router.route('/process').post(processYoutubeVideo);

// Generate a preview of a blog post from a YouTube video without creating it
router.route('/preview').post(previewYoutubeVideo);

module.exports = router;