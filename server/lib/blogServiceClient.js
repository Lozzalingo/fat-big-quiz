/**
 * Blog Service client for Fat Big Quiz.
 *
 * Wraps the shared @lozzalingo/blog-client package and adapts
 * blog service responses to the field shape the FBQ frontend expects.
 * Falls back to the local Prisma/MySQL database if the service is unreachable.
 *
 * Console logging prefix: [BLOG]
 */

const { BlogClient } = require('@lozzalingo/blog-client');

const client = new BlogClient({
  userAgent: 'FatBigQuiz/1.0',
  // FBQ has a full local MySQL fallback (all posts), so fail fast when the
  // central blog service hangs. The default 8s timeout made every uncached
  // blog request (and therefore homepage SSR) block for 8+ seconds whenever
  // blog.laurence.computer was slow.
  timeoutMs: 2500,
});

/**
 * Map a blog service article to the shape the FBQ frontend expects.
 * The FBQ BlogPost type: { id, title, slug, content, excerpt, coverImage,
 *   published, createdAt, updatedAt, metaTitle, metaDescription, authorId,
 *   categoryId, viewCount, author: { firstName, avatar, bio },
 *   category: { id, name }, tags: [{ id, name }], comments: [] }
 */
function adaptArticle(a) {
  return {
    id: String(a.id),
    title: a.title || '',
    slug: a.slug || '',
    content: a.content_html || '',
    excerpt: a.excerpt || '',
    coverImage: a.og_image_url || '',
    published: a.status === 'published',
    createdAt: a.published_at || a.created_at || '',
    updatedAt: a.updated_at || '',
    metaTitle: a.seo_title || a.title || '',
    metaDescription: a.seo_description || a.excerpt || '',
    authorId: '',
    categoryId: a.category_id ? String(a.category_id) : '',
    viewCount: 0,
    author: {
      firstName: a.author || 'Fat Big Quiz',
      avatar: null,
      bio: null,
    },
    category: a.category_name ? { id: String(a.category_id || ''), name: a.category_name } : null,
    tags: (a.tags || []).map(t => ({
      id: typeof t === 'string' ? t : (t.id || ''),
      name: typeof t === 'string' ? t : (t.name || ''),
    })),
    comments: [],
  };
}

function isConfigured() {
  return client.isConfigured();
}

/**
 * Fetch all published articles from the blog service (paginated).
 * Returns { posts, pagination } or null if unavailable.
 */
async function getArticles({ page = 1, limit = 10, categoryName, search } = {}) {
  const result = await client.listArticles({
    page,
    perPage: limit,
    category: categoryName,
    search,
  });

  if (!result) return null;

  return {
    posts: result.articles.map(adaptArticle),
    pagination: {
      total: result.total,
      pages: result.pages,
      currentPage: page,
      perPage: limit,
    },
  };
}

/**
 * Fetch a single article by slug from the blog service.
 * Returns the adapted article, null if not found, or 'unavailable' on error.
 */
async function getArticleBySlug(slug) {
  if (!client.isConfigured()) return 'unavailable';

  const article = await client.getArticleBySlug(slug);

  // BlogClient returns null for 404 AND for service unavailable (when no fallback set).
  // We need to distinguish: if configured but got null, it could be either.
  // Check cache state to determine: if we got null and service was reachable, it's a real 404.
  if (article === null) {
    // The shared client returns null for both "not found" and "unavailable with no fallback".
    // We return null (let caller try local DB) since we cannot distinguish here.
    return null;
  }

  return adaptArticle(article);
}

/**
 * Fetch all published articles (unpaginated) for sitemap generation.
 * Returns array of { slug, updatedAt, createdAt, published } or null on error.
 */
async function getAllArticlesForSitemap() {
  const entries = await client.getSitemapEntries();
  if (!entries) return null;

  return entries.map(e => ({
    slug: e.slug,
    updatedAt: e.updatedAt,
    createdAt: e.createdAt,
    published: true,
  }));
}

/**
 * Fetch categories from the blog service.
 * Returns array of { id, name, type } or null on error.
 */
async function getCategories() {
  const categories = await client.listCategories();
  if (!categories) return null;

  return categories.map(c => ({
    id: String(c.id),
    name: c.name || c.slug || '',
    type: 'BLOG',
  }));
}

/**
 * Get the RSS feed URL for this site.
 * @returns {string}
 */
function getRssFeedUrl() {
  return client.getRssFeedUrl();
}

module.exports = {
  isConfigured,
  getArticles,
  getArticleBySlug,
  getAllArticlesForSitemap,
  getCategories,
  getRssFeedUrl,
};
