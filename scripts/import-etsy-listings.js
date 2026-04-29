#!/usr/bin/env node
/**
 * Import Etsy listings into Fat Big Quiz
 *
 * What it does:
 * 1. Reads the Etsy JSON export
 * 2. Skips listings already on the live site (by slug match)
 * 3. Downloads main images (rank 1) from Etsy, uploads to DO Spaces
 * 4. Strips boilerplate from descriptions, keeps only quiz-specific content
 * 5. Creates products via the local API (POST /api/products)
 *
 * Usage:
 *   node scripts/import-etsy-listings.js --dry-run     # preview only
 *   node scripts/import-etsy-listings.js               # actually import
 *   node scripts/import-etsy-listings.js --limit 5     # import first 5
 */

// dotenv lives in server/node_modules
require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Config ──────────────────────────────────────────────────────────────────

const ETSY_FILE = process.env.ETSY_FILE || path.join(process.env.HOME, 'Downloads', 'fat big quiz listings.json');
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx > -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();

// Category ID for printable-quizzes on the live site
const PRINTABLE_QUIZZES_CATEGORY_ID = '0c593d30-377a-4c1a-84b7-423c515037f6';

// Quiz format: fancy-quiz (the one most Etsy listings match)
const FANCY_QUIZ_FORMAT_ID = '270a5198-621c-4abc-86e4-6c4fe91ef967';

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/&#39;/g, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Strip Etsy boilerplate from descriptions, keeping only the quiz-specific content.
 * Removes:
 *  - Generic intro about "crafted for easy downloading..."
 *  - "Files are provided in PDF..." paragraphs
 *  - "Please note: Downloads are currently not supported..." lines
 *  - "Each download includes a question sheet, answer sheet..." (generic)
 *  - "Each purchase includes both a question sheet..." (generic)
 *  - "Specially designed to be downloaded, printed..." paragraphs
 */
function cleanDescription(raw) {
  if (!raw) return '';

  const lines = raw.split('\n');
  const filtered = [];

  const boilerplatePatterns = [
    /^Our quizzes are (crafted|designed) for easy downloading/i,
    /^Specially designed to be downloaded, printed/i,
    /^Files are provided in (PDF|PowerPoint)/i,
    /^✨\s*Files are provided/i,
    /^Please note:?\s*Downloads are (currently )?not supported/i,
    /^Each (download|purchase) includes (both )?a question sheet,?\s*answer sheet/i,
    /^Don['']t have it\? Get a free/i,
    /^👉\s*You must have PowerPoint to play/i,
  ];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines at the start
    if (filtered.length === 0 && trimmed === '') continue;

    // Skip boilerplate lines
    if (boilerplatePatterns.some(p => p.test(trimmed))) continue;

    filtered.push(line);
  }

  // Trim trailing empty lines
  while (filtered.length > 0 && filtered[filtered.length - 1].trim() === '') {
    filtered.pop();
  }

  // If everything was boilerplate, return a minimal fallback
  if (filtered.length === 0) {
    return '';
  }

  return filtered.join('\n').trim();
}

/**
 * Identify shared images (appear in multiple listings).
 * Returns a Set of listing_image_id values that are shared.
 */
function findSharedImageIds(listings) {
  const imageUsage = {};
  for (const listing of listings) {
    for (const img of (listing.images || [])) {
      if (!imageUsage[img.listing_image_id]) imageUsage[img.listing_image_id] = 0;
      imageUsage[img.listing_image_id]++;
    }
  }
  return new Set(
    Object.entries(imageUsage)
      .filter(([, count]) => count > 1)
      .map(([id]) => Number(id))
  );
}

/**
 * Get the main (unique) images for a listing, excluding shared/instruction images.
 * Returns only images that are unique to this listing, sorted by rank.
 * Falls back to the rank-1 image if ALL images are shared (rare edge case).
 */
function getMainImages(listing, sharedImageIds) {
  const allImages = (listing.images || []).sort((a, b) => a.rank - b.rank);
  const uniqueImages = allImages.filter(img => !sharedImageIds.has(img.listing_image_id));

  // If every image is shared, fall back to the rank-1 image as the cover
  if (uniqueImages.length === 0 && allImages.length > 0) {
    console.log('[Import]   Note: all images are shared, using rank-1 as cover');
    return [allImages[0]];
  }

  return uniqueImages;
}

/**
 * Download a file from a URL and return it as a Buffer.
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Upload a buffer to DO Spaces via the local server's spaces utility.
 */
async function uploadImageToSpaces(buffer, fileName, subFolder) {
  const { uploadToSpaces } = require('../server/utils/spaces');

  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  const contentType = mimeTypes[ext] || 'image/jpeg';

  const result = await uploadToSpaces(buffer, fileName, subFolder, contentType);
  console.log('[Import] Uploaded to CDN:', result.fileName);
  return result;
}

/**
 * Create a product via the local API.
 */
async function createProduct(productData) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(productData),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Create an image record linked to a product.
 */
async function createImageRecord(productId, imageFileName) {
  const res = await fetch(`${API_BASE}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productID: productId,
      image: imageFileName,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[Import] Failed to create image record:', text);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Import] Starting Etsy listing import');
  console.log('[Import] Dry run:', DRY_RUN);
  console.log('[Import] Limit:', LIMIT === Infinity ? 'none' : LIMIT);

  // 1. Load Etsy data
  let rawPath = ETSY_FILE;
  // Convert RTF to JSON if needed
  if (rawPath.endsWith('.rtf')) {
    console.log('[Import] RTF file detected, converting to JSON...');
    const { execSync } = require('child_process');
    const jsonPath = '/tmp/etsy_listings_import.json';
    execSync(`textutil -convert txt -stdout "${rawPath}" > "${jsonPath}"`);
    rawPath = jsonPath;
  }

  const listings = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  console.log('[Import] Loaded', listings.length, 'Etsy listings');

  // 2. Fetch existing products from live site to skip duplicates
  let existingSlugs = new Set();
  try {
    const res = await fetch(`${API_BASE}/products`);
    const data = await res.json();
    const products = data.products || data;
    if (Array.isArray(products)) {
      existingSlugs = new Set(products.map(p => p.slug));
    }
    console.log('[Import] Found', existingSlugs.size, 'existing products');
  } catch (err) {
    console.error('[Import] Could not fetch existing products:', err.message);
    console.log('[Import] Continuing without duplicate check');
  }

  // 3. Build shared image set
  const sharedImageIds = findSharedImageIds(listings);
  console.log('[Import] Found', sharedImageIds.size, 'shared/instruction images to exclude');

  // 4. Process each listing
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const listing of listings) {
    if (imported >= LIMIT) {
      console.log('[Import] Reached limit of', LIMIT);
      break;
    }

    const slug = slugify(listing.title);

    // Skip if already exists
    if (existingSlugs.has(slug)) {
      console.log('[Import] SKIP (exists):', slug);
      skipped++;
      continue;
    }

    // Get price in pounds
    const price = listing.price.amount / listing.price.divisor;

    // Clean description
    const description = cleanDescription(listing.description);

    // Get main images (not shared)
    const mainImages = getMainImages(listing, sharedImageIds);
    const primaryImage = mainImages[0]; // rank 1 image (cover)

    console.log('[Import] Processing:', listing.title);
    console.log('[Import]   Slug:', slug);
    console.log('[Import]   Price: £' + price.toFixed(2));
    console.log('[Import]   Images:', mainImages.length, 'unique (excluded', (listing.images || []).length - mainImages.length, 'shared)');
    console.log('[Import]   Description:', description.substring(0, 80) + (description.length > 80 ? '...' : ''));
    console.log('[Import]   Tags:', (listing.tags || []).join(', '));

    if (DRY_RUN) {
      imported++;
      continue;
    }

    try {
      // Download and upload the primary image
      let mainImageFileName = 'product_placeholder.jpg';
      if (primaryImage) {
        const imageUrl = primaryImage.url_fullxfull;
        console.log('[Import]   Downloading image from Etsy...');
        const imageBuffer = await downloadFile(imageUrl);

        // Use the slug as the image name for cleanliness
        const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const imageFileName = `${slug}-cover${ext}`;

        const uploaded = await uploadImageToSpaces(imageBuffer, imageFileName, `products/images`);
        mainImageFileName = uploaded.fileName;
      }

      // Create the product
      const cleanTitle = listing.title.replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      const productData = {
        slug,
        title: cleanTitle,
        mainImage: mainImageFileName,
        price,
        description: description || cleanTitle,
        manufacturer: 'Fat Big Quiz',
        productType: 'DIGITAL_DOWNLOAD',
        inStock: 1,
        categoryIds: [PRINTABLE_QUIZZES_CATEGORY_ID],
        quizFormatId: FANCY_QUIZ_FORMAT_ID,
        tags: listing.tags || [],
      };

      const created = await createProduct(productData);
      console.log('[Import]   Created product:', created.id);

      // Upload additional unique images (rank 2+)
      for (const img of mainImages.slice(1)) {
        try {
          const imgBuffer = await downloadFile(img.url_fullxfull);
          const ext = path.extname(new URL(img.url_fullxfull).pathname) || '.jpg';
          const imgFileName = `${slug}-${img.rank}${ext}`;
          const uploaded = await uploadImageToSpaces(imgBuffer, imgFileName, `products/images`);
          await createImageRecord(created.id, uploaded.fileName);
          console.log('[Import]   Added image rank', img.rank);
        } catch (imgErr) {
          console.error('[Import]   Failed to upload image rank', img.rank, ':', imgErr.message);
        }
      }

      imported++;
      existingSlugs.add(slug); // Prevent duplicates within same run

      // Small delay to avoid hammering Etsy CDN
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.error('[Import] ERROR importing', slug, ':', err.message);
      errors++;
    }
  }

  console.log('');
  console.log('[Import] ═══════════════════════════════════════');
  console.log('[Import] Done!');
  console.log('[Import]   Imported:', imported);
  console.log('[Import]   Skipped (already exist):', skipped);
  console.log('[Import]   Errors:', errors);
  console.log('[Import]   Total Etsy listings:', listings.length);
  console.log('[Import] ═══════════════════════════════════════');
}

main().catch(err => {
  console.error('[Import] Fatal error:', err);
  process.exit(1);
});
