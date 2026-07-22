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

// Public read routes
router.get('/', getAllBlogPosts);
router.get('/search', searchBlogPosts);
router.get('/id/:id', getBlogPostById);
router.get('/slug/:slug', getBlogPostBySlug);
router.get('/:id', getBlogPostById);
router.get('/crosspost/status', (req, res) => {
  res.json({ platforms: getPlatformStatus() });
});

// Admin write routes (protected by adminMiddleware at mount in app.js)
const adminRouter = express.Router();
adminRouter.post('/', createBlogPost);
adminRouter.put('/:id', updateBlogPost);
adminRouter.delete('/:id', deleteBlogPost);
adminRouter.post('/:id/crosspost', async (req, res) => {
  try {
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

router.adminRouter = adminRouter;
module.exports = router;