#!/usr/bin/env node
/**
 * Export all published blog posts from Fat Big Quiz production API
 * and import them into the centralised blog service.
 *
 * Usage:
 *   node scripts/blog-service-import.js [--dry-run] [--limit N]
 *
 * Console prefix: [BLOG-IMPORT]
 */

const BLOG_SERVICE_URL = 'https://blog.laurence.computer';
const BLOG_API_KEY = process.env.BLOG_API_KEY || '';
const FBQ_API_URL = 'https://fatbigquiz.com';
const CDN_BASE = 'https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com/fat-big-quiz/blog';

// Cloudflare blocks default Node fetch UA on POSTs
const HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': BLOG_API_KEY,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : null;

async function fetchAllPosts() {
  console.log('[BLOG-IMPORT] Fetching all published posts from FBQ production API...');
  const allPosts = [];
  let page = 1;
  const perPage = 50;

  while (true) {
    const url = `${FBQ_API_URL}/api/blog?limit=${perPage}&page=${page}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`FBQ API returned ${resp.status} on page ${page}`);
    }
    const data = await resp.json();
    const posts = data.posts || [];
    allPosts.push(...posts);

    const total = data.pagination?.total || 0;
    console.log(`[BLOG-IMPORT] Page ${page}: fetched ${posts.length} posts (${allPosts.length}/${total} total)`);

    if (allPosts.length >= total || posts.length < perPage) break;
    page++;
  }

  return allPosts;
}

async function fetchPostDetail(slug) {
  const url = `${FBQ_API_URL}/api/blog/slug/${slug}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.warn(`[BLOG-IMPORT] Could not fetch detail for slug ${slug}: HTTP ${resp.status}`);
    return null;
  }
  return resp.json();
}

function buildImageUrl(coverImage) {
  if (!coverImage) return null;
  if (coverImage.startsWith('http')) return coverImage;
  return `${CDN_BASE}/${coverImage}`;
}

function mapToServicePayload(post) {
  return {
    title: post.title,
    slug: post.slug,
    content: post.content || '',
    excerpt: post.excerpt || '',
    image_url: buildImageUrl(post.coverImage),
    status: 'published',
    meta_title: post.metaTitle || post.title,
    meta_description: post.metaDescription || post.excerpt || '',
    author: post.author?.firstName || 'Fat Big Quiz',
    category: { name: post.category?.name || 'General' },
    source_id: post.id,
    source_url: `https://fatbigquiz.com/blog/${post.slug}`,
    created_at: post.createdAt,
    updated_at: post.updatedAt,
  };
}

async function checkExistingSlug(slug) {
  const url = `${BLOG_SERVICE_URL}/api/blog/articles/slug/${slug}?site_id=2`;
  const resp = await fetch(url, { headers: HEADERS });
  if (resp.status === 200) {
    const data = await resp.json();
    return data;
  }
  return null;
}

async function importPost(payload) {
  // Check if slug already exists (handles soft-deleted slugs too)
  const existing = await checkExistingSlug(payload.slug);
  if (existing) {
    console.log(`[BLOG-IMPORT] Slug already exists: ${payload.slug} (id ${existing.id}), skipping`);
    return { status: 'skipped', slug: payload.slug, reason: 'exists' };
  }

  const url = `${BLOG_SERVICE_URL}/api/external/articles`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error(`[BLOG-IMPORT] Failed to import ${payload.slug}: HTTP ${resp.status} - ${body}`);
    return { status: 'failed', slug: payload.slug, error: `${resp.status}: ${body}` };
  }

  const result = await resp.json();
  return { status: 'created', slug: payload.slug, id: result.id || result.article?.id };
}

async function main() {
  console.log('[BLOG-IMPORT] Starting Fat Big Quiz blog export/import');
  console.log(`[BLOG-IMPORT] Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  if (LIMIT) console.log(`[BLOG-IMPORT] Limit: ${LIMIT} posts`);

  // Step 1: Fetch all posts from FBQ
  let posts = await fetchAllPosts();
  console.log(`[BLOG-IMPORT] Total posts fetched from FBQ: ${posts.length}`);

  if (LIMIT) {
    posts = posts.slice(0, LIMIT);
    console.log(`[BLOG-IMPORT] Limited to ${posts.length} posts`);
  }

  // Step 2: Fetch full details (content) for each post
  console.log('[BLOG-IMPORT] Fetching full post details...');
  const detailed = [];
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const detail = await fetchPostDetail(post.slug);
    if (detail) {
      detailed.push(detail);
    } else {
      console.warn(`[BLOG-IMPORT] Skipping ${post.slug} (no detail available)`);
    }
    if ((i + 1) % 20 === 0) {
      console.log(`[BLOG-IMPORT] Fetched details: ${i + 1}/${posts.length}`);
    }
  }
  console.log(`[BLOG-IMPORT] Got details for ${detailed.length} posts`);

  // Step 3: Map to blog service payloads
  const payloads = detailed.map(mapToServicePayload);

  // Step 4: Summarise categories
  const categories = {};
  payloads.forEach(p => {
    const cat = p.category?.name || 'Unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });
  console.log('[BLOG-IMPORT] Categories:', JSON.stringify(categories, null, 2));

  if (DRY_RUN) {
    console.log('[BLOG-IMPORT] DRY RUN complete. Sample payload:');
    console.log(JSON.stringify(payloads[0], null, 2));
    console.log(`[BLOG-IMPORT] Would import ${payloads.length} posts`);
    return;
  }

  // Step 5: Import to blog service
  const results = { created: 0, skipped: 0, failed: 0, errors: [] };
  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const result = await importPost(payload);

    if (result.status === 'created') {
      results.created++;
    } else if (result.status === 'skipped') {
      results.skipped++;
    } else {
      results.failed++;
      results.errors.push(result);
    }

    if ((i + 1) % 20 === 0 || i === payloads.length - 1) {
      console.log(`[BLOG-IMPORT] Progress: ${i + 1}/${payloads.length} (created: ${results.created}, skipped: ${results.skipped}, failed: ${results.failed})`);
    }

    // Small delay to avoid rate limiting
    if ((i + 1) % 10 === 0) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log('[BLOG-IMPORT] === IMPORT COMPLETE ===');
  console.log(`[BLOG-IMPORT] Created: ${results.created}`);
  console.log(`[BLOG-IMPORT] Skipped: ${results.skipped}`);
  console.log(`[BLOG-IMPORT] Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('[BLOG-IMPORT] Errors:');
    results.errors.forEach(e => console.log(`  ${e.slug}: ${e.error}`));
  }

  // Step 6: Verify
  console.log('[BLOG-IMPORT] Verifying blog service counts...');
  const verifyResp = await fetch(
    `${BLOG_SERVICE_URL}/api/blog/articles?site_id=2&status=published&per_page=1`,
    { headers: HEADERS }
  );
  if (verifyResp.ok) {
    const verifyData = await verifyResp.json();
    console.log(`[BLOG-IMPORT] Blog service now has ${verifyData.total} published articles for site 2`);
  }
}

main().catch(err => {
  console.error('[BLOG-IMPORT] Fatal error:', err);
  process.exit(1);
});
