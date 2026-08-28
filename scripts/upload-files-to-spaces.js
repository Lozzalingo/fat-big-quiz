#!/usr/bin/env node
/**
 * Upload Etsy download files to DO Spaces and update product records.
 *
 * For each listing in etsy_file_metadata.json:
 *   1. Match to a local product by slug
 *   2. Find the file in ~/Downloads/
 *   3. Upload to DO Spaces (downloads)
 *   4. Update the product's downloadFile field (JSON array of filenames)
 *
 * Usage:
 *   node scripts/upload-files-to-spaces.js --dry-run     # preview only
 *   node scripts/upload-files-to-spaces.js               # upload + update DB
 *   node scripts/upload-files-to-spaces.js --limit 5     # first 5 listings only
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'server', 'node_modules', '@prisma/client'));
const { uploadToSpaces } = require('../server/utils/spaces');

// ── Config ──────────────────────────────────────────────────────────────────

const METADATA_FILE = '/Users/laurencestephan/Downloads/tmp/etsy_file_metadata.json';
const DOWNLOADS_DIR = '/Users/laurencestephan/Downloads';
const UPLOADED_DIR = '/Users/laurencestephan/Downloads/uploaded';
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = (() => {
  const idx = process.argv.indexOf('--limit');
  return idx > -1 ? parseInt(process.argv[idx + 1], 10) : Infinity;
})();

// Shared/explainer files to skip (handled by explainer layer system)
const SHARED_FILES = new Set([
  'ThankYou.png',
  'Howtoprint.png',
  'HowToPlay.png',
  'AnswerSheet-HostInstructions.pdf',
  'AnswerSheet-HostInstructionsMusicPack.pdf',
]);

// Also skip files that are renamed shared images (e.g. "9_9_Howtoprint.png")
function isSharedFile(filename) {
  if (SHARED_FILES.has(filename)) return true;
  // Some listings have prefixed shared files like "9_9_Howtoprint.png" or "8_ThankYou.png"
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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Find a file in Downloads directory. Tries exact match first, then case-insensitive.
 */
function findFile(filename) {
  const exactPath = path.join(DOWNLOADS_DIR, filename);
  if (fs.existsSync(exactPath)) return exactPath;

  // Try case-insensitive scan
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const match = files.find(f => f.toLowerCase() === filename.toLowerCase());
    if (match) return path.join(DOWNLOADS_DIR, match);
  } catch (err) {
    console.error('[Upload] Error scanning downloads dir:', err.message);
  }

  return null;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = new PrismaClient();

  console.log('[Upload] Starting file upload to DO Spaces');
  console.log('[Upload] Dry run:', DRY_RUN);
  console.log('[Upload] Limit:', LIMIT === Infinity ? 'none' : LIMIT);

  // Load metadata
  const metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  console.log('[Upload] Loaded metadata for', metadata.length, 'listings');

  // Load all products from DB
  const allProducts = await prisma.product.findMany({
    where: { productType: 'DIGITAL_DOWNLOAD' },
    select: { id: true, slug: true, title: true, downloadFile: true },
  });
  console.log('[Upload] Found', allProducts.length, 'digital download products in DB');

  // Build slug lookup
  const productBySlug = {};
  for (const p of allProducts) {
    productBySlug[p.slug] = p;
  }

  // Ensure uploaded directory exists
  if (!DRY_RUN && !fs.existsSync(UPLOADED_DIR)) {
    fs.mkdirSync(UPLOADED_DIR, { recursive: true });
  }

  let processed = 0;
  let uploaded = 0;
  let skipped = 0;
  let notFound = 0;
  let errors = 0;
  const missingFiles = [];
  const missingProducts = [];

  for (const listing of metadata) {
    if (processed >= LIMIT) {
      console.log('[Upload] Reached limit of', LIMIT);
      break;
    }

    const slug = slugify(listing.title);
    const product = productBySlug[slug];

    if (!product) {
      console.log('[Upload] SKIP - no matching product for:', listing.title, '(slug:', slug + ')');
      missingProducts.push(listing.title);
      continue;
    }

    // Check if already has files
    const existingFiles = product.downloadFile ? JSON.parse(product.downloadFile) : [];
    if (existingFiles.length > 0) {
      console.log('[Upload] SKIP - already has', existingFiles.length, 'files:', product.title);
      skipped++;
      continue;
    }

    // Get real files (not shared)
    const realFiles = (listing.files.results || []).filter(f => !isSharedFile(f.filename));

    if (realFiles.length === 0) {
      console.log('[Upload] SKIP - no real files for:', listing.title);
      skipped++;
      continue;
    }

    console.log('[Upload] Processing:', listing.title, '(' + realFiles.length + ' files)');

    const uploadedFileNames = [];

    for (const file of realFiles) {
      const filePath = findFile(file.filename);

      if (!filePath) {
        console.error('[Upload]   MISSING:', file.filename);
        missingFiles.push({ listing: listing.title, filename: file.filename });
        notFound++;
        continue;
      }

      if (DRY_RUN) {
        console.log('[Upload]   Would upload:', file.filename, '(' + file.filesize + ')');
        uploadedFileNames.push(file.filename);
        continue;
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(file.filename).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        console.log('[Upload]   Uploading:', file.filename, '(' + file.filesize + ')');
        const result = await uploadToSpaces(fileBuffer, file.filename, 'downloads', contentType);
        console.log('[Upload]   Done:', result.fileName);

        uploadedFileNames.push(result.fileName);
        uploaded++;

        // Move file to uploaded directory
        const destPath = path.join(UPLOADED_DIR, file.filename);
        try {
          fs.renameSync(filePath, destPath);
          console.log('[Upload]   Moved to uploaded/');
        } catch (moveErr) {
          // If rename fails (cross-device), copy + delete
          fs.copyFileSync(filePath, destPath);
          fs.unlinkSync(filePath);
          console.log('[Upload]   Moved to uploaded/ (copy)');
        }
      } catch (err) {
        console.error('[Upload]   ERROR uploading', file.filename, ':', err.message);
        errors++;
      }
    }

    // Update product's downloadFile field
    if (uploadedFileNames.length > 0 && !DRY_RUN) {
      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { downloadFile: JSON.stringify(uploadedFileNames) },
        });
        console.log('[Upload]   Updated product downloadFile with', uploadedFileNames.length, 'files');
      } catch (err) {
        console.error('[Upload]   ERROR updating product:', err.message);
        errors++;
      }
    }

    processed++;
  }

  // Summary
  console.log('');
  console.log('[Upload] ===================================');
  console.log('[Upload] Done!');
  console.log('[Upload]   Listings processed:', processed);
  console.log('[Upload]   Files uploaded:', uploaded);
  console.log('[Upload]   Listings skipped (already have files):', skipped);
  console.log('[Upload]   Files not found locally:', notFound);
  console.log('[Upload]   Errors:', errors);
  console.log('[Upload] ===================================');

  if (missingProducts.length > 0) {
    console.log('');
    console.log('[Upload] Products not found in DB:');
    missingProducts.forEach(t => console.log('  -', t));
  }

  if (missingFiles.length > 0) {
    console.log('');
    console.log('[Upload] Files not found locally:');
    missingFiles.forEach(f => console.log('  -', f.listing, ':', f.filename));
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('[Upload] Fatal error:', err);
  process.exit(1);
});
