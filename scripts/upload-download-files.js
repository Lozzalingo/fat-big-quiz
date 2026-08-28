#!/usr/bin/env node
/**
 * Upload downloadable files to DO Spaces and link them to products.
 *
 * Reads etsy_file_metadata.json, matches listings to products by slug,
 * finds local files in Downloads, uploads to Spaces, and updates
 * each product's downloadFile field.
 *
 * Usage:
 *   node scripts/upload-download-files.js --dry-run     # preview only
 *   node scripts/upload-download-files.js               # upload and link
 *   node scripts/upload-download-files.js --limit 5     # first 5 listings
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'server', 'node_modules', '@prisma/client'));
const { uploadToSpaces } = require('../server/utils/spaces');

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────────────

const METADATA_FILE = path.join(process.env.HOME, 'Downloads', 'tmp', 'etsy_file_metadata.json');
const DOWNLOADS_DIR = path.join(process.env.HOME, 'Downloads');
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx > -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();

// Shared/explainer files to skip (these go via GlobalDownloadFile, not per-product)
// Match by substring since some have numeric prefixes like "9_9_Howtoprint.png"
const SHARED_PATTERNS = [
  'Howtoprint.png',
  'ThankYou.png',
  'HowToPlay.png',
  'AnswerSheet-HostInstructions.pdf',
  'AnswerSheet-HostInstructionsMusicPack.pdf',
];

function isSharedFile(filename) {
  return SHARED_PATTERNS.some(pattern => filename.includes(pattern));
}

// MIME types
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

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
 * Find a file in the Downloads directory (searches root and common subdirs)
 */
function findLocalFile(filename) {
  const searchPaths = [
    path.join(DOWNLOADS_DIR, filename),
    path.join(DOWNLOADS_DIR, 'tmp', filename),
    path.join(DOWNLOADS_DIR, 'uploaded', filename),
  ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Upload] Starting download file upload');
  console.log('[Upload] Dry run:', DRY_RUN);
  console.log('[Upload] Limit:', LIMIT === Infinity ? 'none' : LIMIT);

  // 1. Load metadata
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  console.log('[Upload] Loaded metadata for', metadata.length, 'listings');

  // 2. Fetch all products from DB
  const allProducts = await prisma.product.findMany({
    select: { id: true, slug: true, title: true, downloadFile: true },
  });
  const productsBySlug = new Map(allProducts.map(p => [p.slug, p]));
  console.log('[Upload] Found', allProducts.length, 'products in database');

  // 3. Process each listing
  let processed = 0;
  let uploaded = 0;
  let skipped = 0;
  let missing = 0;
  let alreadyDone = 0;
  let errors = 0;
  const missingFiles = [];

  for (const listing of metadata) {
    if (processed >= LIMIT) break;

    const slug = slugify(listing.title);
    const product = productsBySlug.get(slug);

    if (!product) {
      console.log('[Upload] SKIP (no product found):', slug);
      skipped++;
      continue;
    }

    // Skip if product already has download files
    if (product.downloadFile) {
      try {
        const existing = JSON.parse(product.downloadFile);
        if (Array.isArray(existing) && existing.length > 0) {
          console.log('[Upload] SKIP (already has files):', slug, '-', existing.length, 'files');
          alreadyDone++;
          continue;
        }
      } catch {
        // Not valid JSON, proceed
      }
    }

    // Get real files (not shared)
    const files = (listing.files?.results || [])
      .filter(f => !isSharedFile(f.filename))
      .sort((a, b) => a.rank - b.rank);

    if (files.length === 0) {
      console.log('[Upload] SKIP (no real files):', slug);
      skipped++;
      continue;
    }

    console.log('[Upload] Processing:', listing.title);
    console.log('[Upload]   Files:', files.map(f => f.filename).join(', '));

    // Find and upload each file
    const uploadedFileNames = [];
    let listingOk = true;

    for (const file of files) {
      const localPath = findLocalFile(file.filename);

      if (!localPath) {
        console.error('[Upload]   MISSING:', file.filename);
        missingFiles.push({ listing: listing.title, filename: file.filename });
        missing++;
        listingOk = false;
        continue;
      }

      if (DRY_RUN) {
        console.log('[Upload]   FOUND:', file.filename, '->', localPath);
        uploadedFileNames.push(file.filename);
        continue;
      }

      try {
        const buffer = fs.readFileSync(localPath);
        const ext = path.extname(file.filename).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        console.log('[Upload]   Uploading:', file.filename, `(${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
        const result = await uploadToSpaces(buffer, file.filename, 'downloads', contentType);
        uploadedFileNames.push(result.fileName);
        uploaded++;
        console.log('[Upload]   Uploaded:', result.fileName);
      } catch (err) {
        console.error('[Upload]   ERROR uploading', file.filename, ':', err.message);
        errors++;
        listingOk = false;
      }
    }

    // Update product's downloadFile field
    if (uploadedFileNames.length > 0 && !DRY_RUN) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            downloadFile: JSON.stringify(uploadedFileNames),
          },
        });
        console.log('[Upload]   Updated product downloadFile:', uploadedFileNames.length, 'files');
      } catch (err) {
        console.error('[Upload]   ERROR updating product:', err.message);
        errors++;
      }
    }

    processed++;
  }

  // Summary
  console.log('');
  console.log('[Upload] ═══════════════════════════════════════');
  console.log('[Upload] Done!');
  console.log('[Upload]   Listings processed:', processed);
  console.log('[Upload]   Files uploaded:', uploaded);
  console.log('[Upload]   Already had files:', alreadyDone);
  console.log('[Upload]   Skipped (no product):', skipped);
  console.log('[Upload]   Missing local files:', missing);
  console.log('[Upload]   Errors:', errors);

  if (missingFiles.length > 0) {
    console.log('[Upload]');
    console.log('[Upload] Missing files:');
    for (const m of missingFiles) {
      console.log(`[Upload]   ${m.listing} -> ${m.filename}`);
    }
  }

  console.log('[Upload] ═══════════════════════════════════════');

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[Upload] Fatal error:', err);
  process.exit(1);
});
