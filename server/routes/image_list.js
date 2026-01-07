const express = require('express');
const router = express.Router();
const { listImages } = require('../controllers/image_list');

router.route('/').get(listImages);

module.exports = router;