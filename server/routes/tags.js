const express = require('express');
const router = express.Router();
const {
  getAllTags,
  getTagByName, // Changed from getTagById
  createTag,
  updateTag,
  deleteTag
} = require('../controllers/tags');

// Get all tags or create a new one
router.route('/')
  .get(getAllTags)
  .post(createTag);

// Get a tag by name, update or delete a tag by ID
router.route('/:name')
  .get(getTagByName);

router.route('/:id')
  .put(updateTag)
  .delete(deleteTag);

module.exports = router;