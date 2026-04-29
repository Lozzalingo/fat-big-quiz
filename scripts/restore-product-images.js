#!/usr/bin/env node
/**
 * Restore product images from Etsy, excluding explainer images.
 * Uses raw pixel comparison (sharp) to identify and skip explainers.
 */

const path = require('path');
const serverDir = path.join(__dirname, '..', 'server');
const dotenv = require(path.join(serverDir, 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(serverDir, '.env') });
module.paths.unshift(path.join(serverDir, 'node_modules'));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const sharp = require('sharp');
const { uploadToSpaces } = require(path.join(serverDir, 'utils', 'spaces'));

const ETSY_JSON = '/Users/laurencestephan/Downloads/tmp/fat big quiz listings.json';
const CDN_BASE = process.env.DO_SPACES_CDN_ENDPOINT + '/' + (process.env.DO_SPACES_FOLDER || 'fat-big-quiz');

// Thumbnail size for comparison
const THUMB_SIZE = 32;
// MSE threshold - images below this are considered matches
// Explainers score 0-157, product images score 2000+
const MSE_THRESHOLD = 800;

/**
 * Download an image and return its buffer
 */
async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to download ${url}: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

/**
 * Get raw pixel data as a normalised thumbnail
 */
async function getFingerprint(buffer) {
  const { data } = await sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/**
 * Calculate Mean Squared Error between two pixel buffers
 */
function mse(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum / a.length;
}

/**
 * Check if a buffer matches any of the explainer fingerprints
 */
function isExplainer(fingerprint, explainerFingerprints) {
  for (const ef of explainerFingerprints) {
    const error = mse(fingerprint, ef);
    if (error < MSE_THRESHOLD) return true;
  }
  return false;
}

/**
 * Upload an image to DO Spaces
 */
async function uploadImage(buffer, slug, rank) {
  const filename = `${slug}-${rank}.jpg`;
  const result = await uploadToSpaces(buffer, filename, 'products/images', 'image/jpeg');
  return result.fileName;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('=== DRY RUN ===\n');

  // Step 1: Build explainer fingerprints from our known explainer images on CDN
  console.log('[Setup] Downloading explainer reference images...');
  const explainerFiles = [
    'Design_for_all_occasions_1767729682941.png',
    'Simple_Description_1767729234915.png',
    'Description_1767729682694.png',
    'Thank_You_1767729682325.png',
    'How_to_print_1767729680804.png',
  ];

  const explainerFingerprints = [];
  for (const file of explainerFiles) {
    const url = `${CDN_BASE}/quiz-formats/explainers/${file}`;
    console.log(`[Setup] Fingerprinting: ${file}`);
    const buffer = await downloadImage(url);
    const fp = await getFingerprint(buffer);
    explainerFingerprints.push(fp);
  }

  // 6th explainer: Etsy-specific "How to Download" image (not on our CDN but present on most listings)
  console.log(`[Setup] Fingerprinting: Etsy "How to Download" image`);
  const howToDownloadUrl = 'https://i.etsystatic.com/33166950/r/il/dc0b78/7517222851/il_fullxfull.7517222851_oic1.jpg';
  const htdBuffer = await downloadImage(howToDownloadUrl);
  explainerFingerprints.push(await getFingerprint(htdBuffer));

  console.log(`[Setup] ${explainerFingerprints.length} explainer fingerprints ready\n`);

  // Step 2: Load Etsy data and DB products
  const etsyListings = JSON.parse(fs.readFileSync(ETSY_JSON, 'utf8'));
  const dbProducts = await prisma.product.findMany({ select: { id: true, title: true, slug: true, mainImage: true } });

  const dbByTitle = {};
  for (const p of dbProducts) {
    const key = p.title.toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\u2026/g, '...');
    if (!dbByTitle[key]) dbByTitle[key] = [];
    dbByTitle[key].push(p);
  }

  let totalUploaded = 0;
  let totalSkipped = 0;
  let errors = [];

  // Step 3: For each Etsy listing, download images, filter explainers, upload product images
  for (const listing of etsyListings) {
    const title = listing.title.replace(/&#39;/g, "'");
    const key = title.toLowerCase();

    if (!dbByTitle[key]) {
      console.log(`[Skip] No DB match: ${title}`);
      continue;
    }

    const product = dbByTitle[key][0];
    const sortedImages = [...listing.images].sort((a, b) => a.rank - b.rank);

    console.log(`\n--- ${title} (${product.slug}) ---`);
    console.log(`[Info] Etsy images: ${sortedImages.length}`);

    const productImages = []; // { rank, buffer, fileName }

    for (const img of sortedImages) {
      try {
        const buffer = await downloadImage(img.url_fullxfull);
        const fp = await getFingerprint(buffer);

        if (isExplainer(fp, explainerFingerprints)) {
          console.log(`  rank ${img.rank}: EXPLAINER (skipped)`);
          totalSkipped++;
        } else {
          console.log(`  rank ${img.rank}: PRODUCT`);
          productImages.push({ rank: img.rank, buffer });
        }
      } catch (err) {
        console.error(`  rank ${img.rank}: ERROR - ${err.message}`);
        errors.push({ title, rank: img.rank, error: err.message });
      }
    }

    if (productImages.length === 0) {
      console.log(`[Warn] No product images found for ${title}`);
      continue;
    }

    if (dryRun) {
      console.log(`[DryRun] Would upload ${productImages.length} product images`);
      totalUploaded += productImages.length;
      continue;
    }

    // Upload: first image = mainImage (cover), rest = gallery
    try {
      const coverImg = productImages[0];
      const coverFileName = await uploadImage(coverImg.buffer, product.slug, 'cover');
      await prisma.product.update({
        where: { id: product.id },
        data: { mainImage: coverFileName }
      });
      totalUploaded++;
      console.log(`[Upload] Cover: ${coverFileName}`);

      for (let i = 1; i < productImages.length; i++) {
        const img = productImages[i];
        const fileName = await uploadImage(img.buffer, product.slug, img.rank);
        await prisma.image.create({
          data: { image: fileName, productID: product.id }
        });
        totalUploaded++;
        console.log(`[Upload] Gallery: ${fileName}`);
      }
    } catch (err) {
      console.error(`[Error] Upload failed for ${title}: ${err.message}`);
      errors.push({ title, phase: 'upload', error: err.message });
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Product images uploaded: ${totalUploaded}`);
  console.log(`Explainer images skipped: ${totalSkipped}`);
  if (errors.length) {
    console.log(`Errors: ${errors.length}`);
    errors.forEach(e => console.log(`  ${e.title}: ${e.error}`));
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
