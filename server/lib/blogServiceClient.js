/**
 * Blog Service client for Fat Big Quiz.
 *
 * Fetches published articles from the centralised blog service
 * (blog.laurence.computer, site_id 2) and adapts them to the field
 * shape the frontend BlogPost components expect. Falls back to the
 * local Prisma/MySQL database if the service is unreachable.
 *
 * Console logging prefix: [BLOG]
 */

const BLOG_SERVICE_URL = (process.env.BLOG_SERVICE_URL || '').replace(/\/$/, '');
const BLOG_API_KEY = process.env.BLOG_API_KEY || '';
const BLOG_SITE_ID = process.env.BLOG_SITE_ID || '2';

// Simple in-process TTL cache (60 seconds)
const CACHE_TTL_MS = 60 * 1000;
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.value;
  }
  _cache.delete(key);
  return null;
}

function cacheSet(key, value) {
  _cache.set(key, { ts: Date.now(), value });
}

function isConfigured() {
  return Boolean(BLOG_SERVICE_URL && BLOG_API_KEY);
}

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

/**
 * Fetch all published articles from the blog service (paginated).
 * Returns { posts, pagination } or null if unavailable.
 */
async function getArticles({ page = 1, limit = 10, categoryName, search } = {}) {
  if (!isConfigured()) return null;

  const cacheKey = `list:${page}:${limit}:${categoryName || ''}:${search || ''}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      site_id: BLOG_SITE_ID,
      status: 'published',
      page: String(page),
      per_page: String(limit),
    });
    if (categoryName) params.set('category', categoryName);
    if (search) params.set('search', search);

    const resp = await fetch(`${BLOG_SERVICE_URL}/api/blog/articles?${params}`, {
      headers: {
        'X-API-Key': BLOG_API_KEY,
        'User-Agent': 'FatBigQuiz/1.0',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      console.log(`[BLOG] Service list request failed: HTTP ${resp.status}`);
      return null;
    }

    const data = await resp.json();
    const articles = (data.articles || []).map(adaptArticle);
    const total = data.total || articles.length;

    const result = {
      posts: articles,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
      },
    };

    cacheSet(cacheKey, result);
    console.log(`[BLOG] Fetched ${articles.length} articles from blog service (page ${page}, total ${total})`);
    return result;
  } catch (err) {
    console.log(`[BLOG] Blog service unavailable, will fall back to local DB: ${err.message}`);
    return null;
  }
}

/**
 * Fetch a single article by slug from the blog service.
 * Returns the adapted article, null if not found, or 'unavailable' on error.
 */
async function getArticleBySlug(slug) {
  if (!isConfigured()) return 'unavailable';

  const cacheKey = `slug:${slug}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const resp = await fetch(
      `${BLOG_SERVICE_URL}/api/blog/articles/slug/${encodeURIComponent(slug)}?site_id=${BLOG_SITE_ID}`,
      {
        headers: {
          'X-API-Key': BLOG_API_KEY,
          'User-Agent': 'FatBigQuiz/1.0',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (resp.status === 404) return null;
    if (!resp.ok) {
      console.log(`[BLOG] Service slug request failed: HTTP ${resp.status}`);
      return 'unavailable';
    }

    const article = adaptArticle(await resp.json());
    if (!article.published) return null;

    cacheSet(cacheKey, article);
    return article;
  } catch (err) {
    console.log(`[BLOG] Blog service unavailable for slug ${slug}: ${err.message}`);
    return 'unavailable';
  }
}

/**
 * Fetch all published articles (unpaginated) for sitemap generation.
 * Returns array of { slug, updatedAt, createdAt, published } or null on error.
 */
async function getAllArticlesForSitemap() {
  if (!isConfigured()) return null;

  const cached = cacheGet('sitemap');
  if (cached) return cached;

  try {
    const articles = [];
    let page = 1;
    while (true) {
      const resp = await fetch(
        `${BLOG_SERVICE_URL}/api/blog/articles?site_id=${BLOG_SITE_ID}&status=published&page=${page}&per_page=100`,
        {
          headers: {
            'X-API-Key': BLOG_API_KEY,
            'User-Agent': 'FatBigQuiz/1.0',
          },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      const batch = data.articles || [];
      articles.push(...batch.map(a => ({
        slug: a.slug,
        updatedAt: a.updated_at || a.created_at,
        createdAt: a.published_at || a.created_at,
        published: true,
      })));
      if (!batch.length || articles.length >= (data.total || 0)) break;
      page++;
    }

    console.log(`[BLOG] Fetched ${articles.length} articles for sitemap from blog service`);
    cacheSet('sitemap', articles);
    return articles;
  } catch (err) {
    console.log(`[BLOG] Blog service unavailable for sitemap: ${err.message}`);
    return null;
  }
}

/**
 * Fetch categories from the blog service.
 * Returns array of { id, name } or null on error.
 */
async function getCategories() {
  if (!isConfigured()) return null;

  const cached = cacheGet('categories');
  if (cached) return cached;

  try {
    const resp = await fetch(
      `${BLOG_SERVICE_URL}/api/blog/categories?site_id=${BLOG_SITE_ID}`,
      {
        headers: {
          'X-API-Key': BLOG_API_KEY,
          'User-Agent': 'FatBigQuiz/1.0',
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!resp.ok) return null;

    const data = await resp.json();
    const categories = (data.categories || data || []).map(c => ({
      id: String(c.id),
      name: c.name || c.slug || '',
      type: 'BLOG',
    }));

    cacheSet('categories', categories);
    console.log(`[BLOG] Fetched ${categories.length} categories from blog service`);
    return categories;
  } catch (err) {
    console.log(`[BLOG] Blog service unavailable for categories: ${err.message}`);
    return null;
  }
}

module.exports = {
  isConfigured,
  getArticles,
  getArticleBySlug,
  getAllArticlesForSitemap,
  getCategories,
};
