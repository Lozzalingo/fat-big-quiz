const express = require("express");

const router = express.Router();
const { searchProducts } = require('./search.controller');

router.route("/").get(searchProducts);

module.exports = router;
