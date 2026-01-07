const express = require('express');
const router = express.Router();
const {
  getAllBlogPosts,
  getBlogPostBySlug,
  getBlogPostById,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  searchBlogPosts,
} = require('../controllers/blog');

// Get all blog posts with optional filtering
router.route('/').get(getAllBlogPosts);

// Create a new blog post
router.route('/').post(createBlogPost);

// Search blog posts
router.route('/search').get(searchBlogPosts);

// Get blog post by ID
router.route('/id/:id').get(getBlogPostById);

// Get, update, or delete blog post by ID
router.route('/:id')
  .get(getBlogPostById)
  .put(updateBlogPost)
  .delete(deleteBlogPost);

// Get blog post by slug
router.route('/slug/:slug').get(getBlogPostBySlug);

module.exports = router;