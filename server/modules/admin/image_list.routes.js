const express = require('express');
const router = express.Router();
const { listImages } = require('./image_list.controller');

router.route('/').get(listImages);

module.exports = router;