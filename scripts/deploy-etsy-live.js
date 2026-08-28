#!/usr/bin/env node
/**
 * Deploy Etsy listings to LIVE fatbigquiz.com
 *
 * Phase 1: Import listings (create products via live API)
 * Phase 2: Upload download files to DO Spaces + link to products
 *
 * Usage:
 *   node scripts/deploy-etsy-live.js --dry-run     # preview only
 *   node scripts/deploy-etsy-live.js               # full deploy
 *   node scripts/deploy-etsy-live.js --limit 5     # first 5 only
 *   node scripts/deploy-etsy-live.js --phase2-only # skip import, just upload files
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { uploadToSpaces } = require('../server/utils/spaces');

// ── Config ──────────────────────────────────────────────────────────────────

const ETSY_FILE = '/Users/laurencestephan/Downloads/tmp/fat big quiz listings.json';
const METADATA_FILE = '/Users/laurencestephan/Downloads/tmp/etsy_file_metadata.json';
const DOWNLOADS_DIR = '/Users/laurencestephan/Downloads';
const UPLOADED_DIR = '/Users/laurencestephan/Downloads/uploaded';
const LIVE_API = 'https://fatbigquiz.com/api';

const DRY_RUN = process.argv.includes('--dry-run');
const PHASE2_ONLY = process.argv.includes('--phase2-only');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx > -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();

// IDs that match on the live server
const PRINTABLE_QUIZZES_CATEGORY_ID = '0c593d30-377a-4c1a-84b7-423c515037f6';
const FANCY_QUIZ_FORMAT_ID = '270a5198-621c-4abc-86e4-6c4fe91ef967';

// Shared/explainer files to skip
const SHARED_FILES = new Set([
  'ThankYou.png', 'Howtoprint.png', 'HowToPlay.png',
  'AnswerSheet-HostInstructions.pdf', 'AnswerSheet-HostInstructionsMusicPack.pdf',
]);

function isSharedFile(filename) {
  if (SHARED_FILES.has(filename)) return true;
  const baseName = filename.replace(/^\d+_(\d+_)?/, '');
  return SHARED_FILES.has(baseName);
}

// MIME types
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.zip': 'application/zip',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/&#39;/g, '')
    .replace(/['']/g, '')
    .replace(/&amp;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

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
    if (filtered.length === 0 && trimmed === '') continue;
    if (boilerplatePatterns.some(p => p.test(trimmed))) continue;
    filtered.push(line);
  }
  while (filtered.length > 0 && filtered[filtered.length - 1].trim() === '') filtered.pop();
  if (filtered.length === 0) return '';
  return filtered.join('\n').trim();
}

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

function getMainImages(listing, sharedImageIds) {
  const allImages = (listing.images || []).sort((a, b) => a.rank - b.rank);
  const uniqueImages = allImages.filter(img => !sharedImageIds.has(img.listing_image_id));
  if (uniqueImages.length === 0 && allImages.length > 0) {
    console.log('[Deploy]   Note: all images shared, using rank-1 as cover');
    return [allImages[0]];
  }
  return uniqueImages;
}

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function findLocalFile(filename) {
  const exactPath = path.join(DOWNLOADS_DIR, filename);
  if (fs.existsSync(exactPath)) return exactPath;
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    if (match) return path.join(DOWNLOADS_DIR, match);
  } catch (err) {
    console.error('[Deploy] Error scanning downloads dir:', err.message);
  }
  return null;
}

async function apiGet(endpoint) {
  const res = await fetch(`${LIVE_API}${endpoint}`);
  if (!res.ok) throw new Error(`API GET ${endpoint}: ${res.status}`);
  return res.json();
}

async function apiPost(endpoint, data) {
  const res = await fetch(`${LIVE_API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API POST ${endpoint}: ${res.status} - ${text}`);
  }
  return res.json();
}

async function apiPut(endpoint, data) {
  const res = await fetch(`${LIVE_API}${endpoint}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API PUT ${endpoint}: ${res.status} - ${text}`);
  }
  return res.json();
}

// ── Phase 1: Import Listings ────────────────────────────────────────────────

async function phase1ImportListings() {
  console.log('[Deploy] ═══ PHASE 1: Import Listings to Live ═══');

  const listings = JSON.parse(fs.readFileSync(ETSY_FILE, 'utf8'));
  console.log('[Deploy] Loaded', listings.length, 'Etsy listings');

  // Fetch existing products (mode=admin bypasses pagination)
  const existing = await apiGet('/products?mode=admin');
  const existingSlugs = new Set((Array.isArray(existing) ? existing : existing.products || []).map(p => p.slug));
  console.log('[Deploy] Found', existingSlugs.size, 'existing products on live');

  const sharedImageIds = findSharedImageIds(listings);
  console.log('[Deploy] Found', sharedImageIds.size, 'shared images to exclude');

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const listing of listings) {
    if (imported >= LIMIT) {
      console.log('[Deploy] Reached limit of', LIMIT);
      break;
    }

    const slug = slugify(listing.title);

    if (existingSlugs.has(slug)) {
      console.log('[Deploy] SKIP (exists):', slug);
      skipped++;
      continue;
    }

    const price = listing.price.amount / listing.price.divisor;
    const description = cleanDescription(listing.description);
    const mainImages = getMainImages(listing, sharedImageIds);
    const primaryImage = mainImages[0];

    console.log('[Deploy] Importing:', listing.title);

    if (DRY_RUN) {
      console.log('[Deploy]   [DRY RUN] Would create with', mainImages.length, 'images, price £' + price.toFixed(2));
      imported++;
      existingSlugs.add(slug);
      continue;
    }

    try {
      // Download and upload cover image
      let mainImageFileName = 'product_placeholder.jpg';
      if (primaryImage) {
        const imageUrl = primaryImage.url_fullxfull;
        console.log('[Deploy]   Downloading cover image...');
        const imageBuffer = await downloadFile(imageUrl);
        const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const imageFileName = `${slug}-cover${ext}`;
        const uploaded = await uploadToSpaces(imageBuffer, imageFileName, 'products/images', 'image/jpeg');
        mainImageFileName = uploaded.fileName;
        console.log('[Deploy]   Cover uploaded:', mainImageFileName);
      }

      // Create product
      const cleanTitle = listing.title.replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      const product = await apiPost('/products', {
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
      });

      console.log('[Deploy]   Created product:', product.id);

      // Upload additional images
      for (const img of mainImages.slice(1)) {
        try {
          const imgBuffer = await downloadFile(img.url_fullxfull);
          const ext = path.extname(new URL(img.url_fullxfull).pathname) || '.jpg';
          const imgFileName = `${slug}-${img.rank}${ext}`;
          const uploaded = await uploadToSpaces(imgBuffer, imgFileName, 'products/images', 'image/jpeg');
          await apiPost('/images', { productID: product.id, image: uploaded.fileName });
          console.log('[Deploy]   Added image rank', img.rank);
        } catch (imgErr) {
          console.error('[Deploy]   Failed image rank', img.rank, ':', imgErr.message);
        }
      }

      imported++;
      existingSlugs.add(slug);

      // Small delay to avoid hammering Etsy CDN
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.error('[Deploy] ERROR importing', slug, ':', err.message);
      errors++;
    }
  }

  console.log('[Deploy] Phase 1 complete - Imported:', imported, '| Skipped:', skipped, '| Errors:', errors);
  return { imported, skipped, errors };
}

// ── Phase 2: Upload Download Files ──────────────────────────────────────────

async function phase2UploadFiles() {
  console.log('');
  console.log('[Deploy] ═══ PHASE 2: Upload Download Files ═══');

  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  console.log('[Deploy] Loaded file metadata for', metadata.length, 'listings');

  // Fetch all products from live (mode=admin bypasses pagination)
  const allProducts = await apiGet('/products?mode=admin');
  const products = Array.isArray(allProducts) ? allProducts : allProducts.products || [];
  console.log('[Deploy] Found', products.length, 'products on live');

  // Build slug lookup
  const productBySlug = {};
  for (const p of products) {
    productBySlug[p.slug] = p;
  }

  // Ensure uploaded directory exists
  if (!DRY_RUN && !fs.existsSync(UPLOADED_DIR)) {
    fs.mkdirSync(UPLOADED_DIR, { recursive: true });
  }

  let processed = 0;
  let filesUploaded = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;
  const missingFiles = [];
  const missingProducts = [];

  for (const listing of metadata) {
    if (processed >= LIMIT) break;

    const slug = slugify(listing.title);
    const product = productBySlug[slug];

    if (!product) {
      console.log('[Deploy] SKIP - no product for:', listing.title, '(slug:', slug + ')');
      missingProducts.push(listing.title);
      continue;
    }

    // Check if already has download files
    const existingFiles = product.downloadFile ? (typeof product.downloadFile === 'string' ? JSON.parse(product.downloadFile) : product.downloadFile) : [];
    if (existingFiles.length > 0) {
      console.log('[Deploy] SKIP - already has', existingFiles.length, 'files:', product.title);
      skipped++;
      continue;
    }

    // Get real files (not shared)
    const realFiles = (listing.files.results || []).filter(f => !isSharedFile(f.filename));
    if (realFiles.length === 0) {
      console.log('[Deploy] SKIP - no real files for:', listing.title);
      skipped++;
      continue;
    }

    console.log('[Deploy] Processing:', listing.title, '(' + realFiles.length + ' files)');

    const uploadedFileNames = [];

    for (const file of realFiles) {
      const filePath = findLocalFile(file.filename);

      if (!filePath) {
        console.error('[Deploy]   MISSING:', file.filename);
        missingFiles.push({ listing: listing.title, filename: file.filename });
        notFound++;
        continue;
      }

      if (DRY_RUN) {
        console.log('[Deploy]   [DRY RUN] Would upload:', file.filename, '(' + file.filesize + ')');
        uploadedFileNames.push(file.filename);
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(file.filename).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        console.log('[Deploy]   Uploading:', file.filename, '(' + file.filesize + ')');
        const result = await uploadToSpaces(fileBuffer, file.filename, 'downloads', contentType);
        console.log('[Deploy]   Done:', result.fileName);

        uploadedFileNames.push(result.fileName);
        filesUploaded++;

        // Move file to uploaded directory
        const destPath = path.join(UPLOADED_DIR, file.filename);
        try {
          fs.renameSync(filePath, destPath);
        } catch (moveErr) {
          fs.copyFileSync(filePath, destPath);
          fs.unlinkSync(filePath);
        }
        console.log('[Deploy]   Moved to uploaded/');
      } catch (err) {
        console.error('[Deploy]   ERROR uploading', file.filename, ':', err.message);
        errors++;
      }
    }

    // Update product's downloadFile field via API
    if (uploadedFileNames.length > 0 && !DRY_RUN) {
      try {
        await apiPut(`/products/${product.id}`, {
          downloadFile: JSON.stringify(uploadedFileNames),
        });
        console.log('[Deploy]   Updated product with', uploadedFileNames.length, 'download files');
      } catch (err) {
        console.error('[Deploy]   ERROR updating product:', err.message);
        errors++;
      }
    }

    processed++;
  }

  console.log('[Deploy] Phase 2 complete - Processed:', processed, '| Files uploaded:', filesUploaded, '| Skipped:', skipped, '| Missing:', notFound, '| Errors:', errors);

  if (missingProducts.length > 0) {
    console.log('[Deploy] Products not found on live:');
    missingProducts.forEach(t => console.log('  -', t));
  }
  if (missingFiles.length > 0) {
    console.log('[Deploy] Files not found locally:');
    missingFiles.forEach(f => console.log('  -', f.listing, ':', f.filename));
  }

  return { processed, filesUploaded, skipped, notFound, errors };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Deploy] ═══════════════════════════════════════════');
  console.log('[Deploy] DEPLOYING ETSY LISTINGS TO LIVE');
  console.log('[Deploy] Target:', LIVE_API);
  console.log('[Deploy] Dry run:', DRY_RUN);
  console.log('[Deploy] Limit:', LIMIT === Infinity ? 'none' : LIMIT);
  console.log('[Deploy] Phase 2 only:', PHASE2_ONLY);
  console.log('[Deploy] ═══════════════════════════════════════════');
  console.log('');

  let phase1Result = { imported: 0, skipped: 0, errors: 0 };
  let phase2Result = { processed: 0, filesUploaded: 0, skipped: 0, notFound: 0, errors: 0 };

  if (!PHASE2_ONLY) {
    phase1Result = await phase1ImportListings();
  }

  phase2Result = await phase2UploadFiles();

  console.log('');
  console.log('[Deploy] ═══════════════════════════════════════════');
  console.log('[Deploy] ALL DONE!');
  console.log('[Deploy]   Listings imported:', phase1Result.imported);
  console.log('[Deploy]   Listings skipped (existed):', phase1Result.skipped);
  console.log('[Deploy]   Download files uploaded:', phase2Result.filesUploaded);
  console.log('[Deploy]   Products with files already:', phase2Result.skipped);
  console.log('[Deploy]   Total errors:', phase1Result.errors + phase2Result.errors);
  console.log('[Deploy] ═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('[Deploy] Fatal error:', err);
  process.exit(1);
});
