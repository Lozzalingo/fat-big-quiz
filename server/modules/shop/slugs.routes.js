const express = require("express");

const router = express.Router();

const { getProductBySlug } = require('./slugs.controller');

router.route("/:slug").get(getProductBySlug);

module.exports = router;