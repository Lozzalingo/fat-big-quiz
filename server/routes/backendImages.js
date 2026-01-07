const express = require("express");
const router = express.Router();
const { uploadImage, deleteImage } = require("../controllers/backendImages");

router.route("/")
  .post(uploadImage)
  .delete(deleteImage);

module.exports = router;