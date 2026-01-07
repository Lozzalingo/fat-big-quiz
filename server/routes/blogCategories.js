const express = require('express');
const router = express.Router();
const {
  getAllBlogCategories,
  getBlogCategoryById,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} = require('../controllers/blogCategories.js');

// Get all blog categories or create a new one
router.route('/')
  .get(getAllBlogCategories)
  .post(createBlogCategory);

// Get, update, or delete a blog category by ID
router.route('/:id')
  .get(getBlogCategoryById)
  .put(updateBlogCategory)
  .delete(deleteBlogCategory);

module.exports = router;