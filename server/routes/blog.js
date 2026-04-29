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
const { crosspostArticle, getPlatformStatus } = require('../services/crosspost');

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

// Crosspost a blog post to social platforms
router.post('/:id/crosspost', async (req, res) => {
  try {
    const post = await require('@prisma/client').PrismaClient && getBlogPostById;
    // Fetch the post data
    const postRes = await fetch(`http://localhost:3001/api/blog/id/${req.params.id}`);
    if (!postRes.ok) return res.status(404).json({ error: 'Post not found' });
    const article = await postRes.json();
    const results = await crosspostArticle(article);
    res.json({ results });
  } catch (error) {
    console.error('[Blog] Crosspost error:', error.message);
    res.status(500).json({ error: 'Crosspost failed' });
  }
});

// Get crosspost platform status
router.get('/crosspost/status', (req, res) => {
  res.json({ platforms: getPlatformStatus() });
});

module.exports = router;