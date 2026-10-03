const express = require("express");
const router = express.Router();
const { uploadMainImage } = require('./mainImages.controller');

router.route("/").post(uploadMainImage);

module.exports = router;
