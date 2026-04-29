#!/usr/bin/env node
/**
 * Upload Watcher - watches Downloads for new files, uploads to Spaces, links to products
 *
 * Usage:
 *   node scripts/upload-watcher.js                    # Watch mode - processes new files as they appear
 *   node scripts/upload-watcher.js --process           # Process all existing files in Downloads
 *   node scripts/upload-watcher.js --link <file> <slug> # Manually link an uploaded file to a product
 *   node scripts/upload-watcher.js --unmatched         # Show files that couldn't be matched
 *   node scripts/upload-watcher.js --status            # Show progress (how many products still need files)
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '..', 'server', 'node_modules', '@prisma/client'));
const { uploadToSpaces } = require(path.join(__dirname, '..', 'server', 'utils', 'spaces.js'));

const prisma = new PrismaClient();

// ── Config ──────────────────────────────────────────────────────────────────
const WATCH_DIR = '/Users/laurencestephan/Downloads';
const UPLOADED_DIR = '/Users/laurencestephan/Downloads/uploaded';
const UNMATCHED_DIR = '/Users/laurencestephan/Downloads/uploaded/unmatched';
const POLL_INTERVAL = 3000; // 3 seconds
const VALID_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.zip', '.pptx', '.ppt'];

// Track files we've already processed this session
const processedFiles = new Set();
// Track unmatched files
const unmatchedFiles = [];
// Products cache
let productsCache = null;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load all digital download products from DB
 */
async function loadProducts() {
  if (productsCache) return productsCache;

  const products = await prisma.product.findMany({
    where: { productType: 'DIGITAL_DOWNLOAD' },
    select: { id: true, title: true, slug: true, downloadFile: true },
  });

  productsCache = products;
  console.log(`[Watcher] Loaded ${products.length} digital products`);
  console.log(`[Watcher] ${products.filter(p => !p.downloadFile).length} still need download files`);
  return products;
}

/**
 * Normalise a string for fuzzy matching - lowercase, remove common words, strip punctuation
 */
function normalise(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(printable|quiz|level|pack|the|a|an|and|of|for|in|on|at|to|is)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meaningful words from a filename
 */
function filenameToWords(filename) {
  const base = path.basename(filename, path.extname(filename));
  // Split camelCase, PascalCase, and separators
  return base
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-\.]+/g, ' ')
    .replace(/\s*\(\d+\)\s*$/, '') // remove (1) duplicates
    .trim();
}

/**
 * Score how well a filename matches a product title
 * Returns 0-1 where 1 is perfect match
 */
function matchScore(filename, productTitle) {
  const fileWords = normalise(filenameToWords(filename)).split(' ').filter(w => w.length > 2);
  const titleWords = normalise(productTitle).split(' ').filter(w => w.length > 2);

  if (fileWords.length === 0 || titleWords.length === 0) return 0;

  // Count how many file words appear in the title
  let matchCount = 0;
  for (const fw of fileWords) {
    for (const tw of titleWords) {
      if (tw.includes(fw) || fw.includes(tw)) {
        matchCount++;
        break;
      }
    }
  }

  // Score based on proportion of file words that matched
  const fileMatchRatio = matchCount / fileWords.length;
  // Also consider how many title words were covered
  const titleMatchRatio = matchCount / titleWords.length;

  return (fileMatchRatio * 0.6) + (titleMatchRatio * 0.4);
}

/**
 * Find the best matching product for a filename
 */
function findBestMatch(filename, products) {
  let bestProduct = null;
  let bestScore = 0;

  for (const product of products) {
    const score = matchScore(filename, product.title);
    if (score > bestScore) {
      bestScore = score;
      bestProduct = product;
    }
  }

  return { product: bestProduct, score: bestScore };
}

/**
 * Get MIME type from extension
 */
function getMimeType(ext) {
  const types = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.zip': 'application/zip',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
  };
  return types[ext] || 'application/octet-stream';
}

/**
 * Upload a file to Spaces and return the CDN filename
 */
async function uploadFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(ext);

  console.log(`[Upload] Uploading ${fileName} (${(buffer.length / 1024).toFixed(0)} KB)...`);

  const result = await uploadToSpaces(buffer, fileName, 'downloads', mimeType);
  console.log(`[Upload] Success: ${result.cdnUrl}`);

  return result.fileName; // The unique filename on Spaces
}

/**
 * Add a download file to a product's downloadFile JSON array
 */
async function linkFileToProduct(productId, spacesFileName) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { downloadFile: true, title: true },
  });

  let files = [];
  if (product.downloadFile) {
    try {
      const parsed = JSON.parse(product.downloadFile);
      files = Array.isArray(parsed) ? parsed : [product.downloadFile];
    } catch {
      files = [product.downloadFile];
    }
  }

  files.push(spacesFileName);

  await prisma.product.update({
    where: { id: productId },
    data: { downloadFile: JSON.stringify(files) },
  });

  console.log(`[Link] Added "${spacesFileName}" to "${product.title}" (now ${files.length} files)`);
}

/**
 * Process a single file - upload and try to match
 */
async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Skip non-matching extensions
  if (!VALID_EXTENSIONS.includes(ext)) return;

  // Skip already processed
  if (processedFiles.has(filePath)) return;

  // Skip if file is still being written (check if size is stable)
  const stat1 = fs.statSync(filePath);
  await new Promise(r => setTimeout(r, 500));
  try {
    const stat2 = fs.statSync(filePath);
    if (stat1.size !== stat2.size) {
      console.log(`[Watcher] ${fileName} still downloading, will retry...`);
      return;
    }
  } catch {
    return; // File was moved/deleted
  }

  processedFiles.add(filePath);
  const products = await loadProducts();

  // Upload to Spaces
  let spacesFileName;
  try {
    spacesFileName = await uploadFile(filePath);
  } catch (err) {
    console.error(`[Upload] FAILED for ${fileName}:`, err.message);
    return;
  }

  // Try to match to a product
  const { product, score } = findBestMatch(fileName, products);

  if (product && score >= 0.5) {
    console.log(`[Match] "${fileName}" -> "${product.title}" (score: ${(score * 100).toFixed(0)}%)`);
    try {
      await linkFileToProduct(product.id, spacesFileName);
    } catch (err) {
      console.error(`[Link] FAILED:`, err.message);
    }
  } else if (product) {
    console.log(`[Match] WEAK: "${fileName}" ~> "${product.title}" (score: ${(score * 100).toFixed(0)}%)`);
    console.log(`[Match] Skipping auto-link. Use: node scripts/upload-watcher.js --link "${spacesFileName}" "${product.slug}"`);
    unmatchedFiles.push({ fileName, spacesFileName, bestGuess: product.title, bestSlug: product.slug, score });
  } else {
    console.log(`[Match] NO MATCH for "${fileName}"`);
    unmatchedFiles.push({ fileName, spacesFileName, bestGuess: null, bestSlug: null, score: 0 });
  }

  // Move to uploaded folder
  const destDir = (product && score >= 0.5) ? UPLOADED_DIR : UNMATCHED_DIR;
  fs.mkdirSync(destDir, { recursive: true });

  const destPath = path.join(destDir, fileName);
  try {
    fs.renameSync(filePath, destPath);
    console.log(`[Move] ${fileName} -> ${destDir.replace(WATCH_DIR + '/', '')}/`);
  } catch (err) {
    console.error(`[Move] Failed:`, err.message);
  }
}

/**
 * Scan Downloads for files to process
 */
async function scanAndProcess() {
  const files = fs.readdirSync(WATCH_DIR)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      return VALID_EXTENSIONS.includes(ext);
    })
    .filter(f => !processedFiles.has(path.join(WATCH_DIR, f)))
    .map(f => path.join(WATCH_DIR, f));

  for (const filePath of files) {
    await processFile(filePath);
  }
}

// ── Commands ────────────────────────────────────────────────────────────────

async function cmdWatch() {
  console.log('[Watcher] Starting watch mode...');
  console.log(`[Watcher] Watching: ${WATCH_DIR}`);
  console.log(`[Watcher] Uploaded files move to: ${UPLOADED_DIR}`);
  console.log(`[Watcher] Unmatched files move to: ${UNMATCHED_DIR}`);
  console.log(`[Watcher] Extensions: ${VALID_EXTENSIONS.join(', ')}`);
  console.log('[Watcher] Press Ctrl+C to stop\n');

  await loadProducts();

  // Initial scan
  await scanAndProcess();

  // Poll for new files
  setInterval(async () => {
    try {
      await scanAndProcess();
    } catch (err) {
      console.error('[Watcher] Scan error:', err.message);
    }
  }, POLL_INTERVAL);
}

async function cmdProcess() {
  console.log('[Process] Processing all files in Downloads...\n');
  await loadProducts();
  await scanAndProcess();

  console.log('\n[Process] Done.');
  if (unmatchedFiles.length > 0) {
    console.log(`[Process] ${unmatchedFiles.length} unmatched files (moved to unmatched/):`);
    unmatchedFiles.forEach(f => {
      console.log(`  ${f.fileName} -> best guess: "${f.bestGuess}" (${(f.score * 100).toFixed(0)}%)`);
      if (f.bestSlug) {
        console.log(`    Fix: node scripts/upload-watcher.js --link "${f.spacesFileName}" "${f.bestSlug}"`);
      }
    });
  }

  await prisma.$disconnect();
}

async function cmdLink(spacesFileName, slug) {
  if (!spacesFileName || !slug) {
    console.error('Usage: --link <spaces-filename> <product-slug>');
    process.exit(1);
  }

  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product) {
    console.error(`[Link] Product not found with slug: ${slug}`);
    process.exit(1);
  }

  await linkFileToProduct(product.id, spacesFileName);
  console.log('[Link] Done.');
  await prisma.$disconnect();
}

async function cmdUnmatched() {
  // Check the unmatched folder
  fs.mkdirSync(UNMATCHED_DIR, { recursive: true });
  const files = fs.readdirSync(UNMATCHED_DIR);

  if (files.length === 0) {
    console.log('[Unmatched] No unmatched files.');
  } else {
    console.log(`[Unmatched] ${files.length} files need manual linking:\n`);
    const products = await loadProducts();

    for (const file of files) {
      const { product, score } = findBestMatch(file, products);
      console.log(`  ${file}`);
      if (product) {
        console.log(`    Best guess: "${product.title}" (${(score * 100).toFixed(0)}%)`);
        console.log(`    Link: node scripts/upload-watcher.js --link "<spaces-name>" "${product.slug}"`);
      }
      console.log('');
    }
  }

  await prisma.$disconnect();
}

async function cmdStatus() {
  const products = await prisma.product.findMany({
    where: { productType: 'DIGITAL_DOWNLOAD' },
    select: { title: true, downloadFile: true },
  });

  const withFiles = products.filter(p => p.downloadFile);
  const withoutFiles = products.filter(p => !p.downloadFile);

  console.log(`[Status] ${withFiles.length}/${products.length} products have download files`);
  console.log(`[Status] ${withoutFiles.length} still need files:\n`);

  withoutFiles.forEach(p => console.log(`  - ${p.title}`));

  await prisma.$disconnect();
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--link')) {
    const idx = args.indexOf('--link');
    await cmdLink(args[idx + 1], args[idx + 2]);
  } else if (args.includes('--unmatched')) {
    await cmdUnmatched();
  } else if (args.includes('--status')) {
    await cmdStatus();
  } else if (args.includes('--process')) {
    await cmdProcess();
  } else {
    await cmdWatch();
  }
}

main().catch(err => {
  console.error('[Fatal]', err);
  process.exit(1);
});
