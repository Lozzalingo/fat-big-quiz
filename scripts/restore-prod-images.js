#!/usr/bin/env node
/**
 * Restore product images on PRODUCTION from Etsy.
 * Uses raw MySQL via SSH tunnel (port 33061) to avoid Prisma schema mismatch.
 * Uses pixel comparison to exclude explainer images.
 */

const path = require('path');
const serverDir = path.join(__dirname, '..', 'server');
require(path.join(serverDir, 'node_modules', 'dotenv')).config({ path: path.join(serverDir, '.env') });
module.paths.unshift(path.join(serverDir, 'node_modules'));

const sharp = require('sharp');
const fs = require('fs');
const mysql = require('mysql2/promise');
const { uploadToSpaces } = require(path.join(serverDir, 'utils', 'spaces'));

const ETSY_JSON = '/Users/laurencestephan/Downloads/tmp/fat big quiz listings.json';
const CDN_BASE = process.env.DO_SPACES_CDN_ENDPOINT + '/' + (process.env.DO_SPACES_FOLDER || 'fat-big-quiz');
const THUMB_SIZE = 32;
const MSE_THRESHOLD = 800;

async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

async function getFingerprint(buffer) {
  const { data } = await sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

function mse(a, b) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; sum += d * d; }
  return sum / a.length;
}

function isExplainer(fp, refs) {
  return Math.min(...refs.map(r => mse(fp, r))) < MSE_THRESHOLD;
}

async function uploadImage(buffer, slug, rank) {
  const filename = `${slug}-${rank}.jpg`;
  const result = await uploadToSpaces(buffer, filename, 'products/images', 'image/jpeg');
  return result.fileName;
}

async function main() {
  // Connect via SSH tunnel on port 33061
  const db = await mysql.createConnection({
    host: '127.0.0.1',
    port: 33061,
    user: 'fatbigquiz',
    password: 'fatbigquiz_secure_2024',
    database: 'fatbigquiz'
  });
  console.log('[DB] Connected to production');

  // Step 1: Clear all existing gallery images and mainImage on production
  const [delResult] = await db.execute('DELETE FROM Image');
  console.log(`[DB] Deleted ${delResult.affectedRows} gallery images`);

  await db.execute("UPDATE Product SET mainImage = '' WHERE mainImage IS NOT NULL");
  console.log('[DB] Cleared all mainImage fields');

  // Step 2: Build explainer fingerprints
  console.log('[Setup] Fingerprinting explainer images...');
  const explainerFPs = [];
  for (const f of [
    'Design_for_all_occasions_1767729682941.png',
    'Simple_Description_1767729234915.png',
    'Description_1767729682694.png',
    'Thank_You_1767729682325.png',
    'How_to_print_1767729680804.png',
  ]) {
    const buf = await downloadImage(`${CDN_BASE}/quiz-formats/explainers/${f}`);
    explainerFPs.push(await getFingerprint(buf));
  }
  // 6th: Etsy "How to Download"
  const htdBuf = await downloadImage('https://i.etsystatic.com/33166950/r/il/dc0b78/7517222851/il_fullxfull.7517222851_oic1.jpg');
  explainerFPs.push(await getFingerprint(htdBuf));
  console.log(`[Setup] ${explainerFPs.length} explainer fingerprints ready\n`);

  // Step 3: Load Etsy listings and production products
  const etsyListings = JSON.parse(fs.readFileSync(ETSY_JSON, 'utf8'));
  const [prodRows] = await db.execute('SELECT id, title, slug FROM Product');
  console.log(`[DB] ${prodRows.length} products loaded`);

  const dbByTitle = {};
  for (const p of prodRows) {
    const key = p.title.toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\u2026/g, '...');
    if (!dbByTitle[key]) dbByTitle[key] = [];
    dbByTitle[key].push(p);
  }

  let totalUploaded = 0, totalSkipped = 0, errors = [];

  // Step 4: For each Etsy listing, download, filter, upload
  for (const listing of etsyListings) {
    const title = listing.title.replace(/&#39;/g, "'");
    const key = title.toLowerCase();

    if (!dbByTitle[key]) {
      console.log(`[Skip] No match: ${title}`);
      continue;
    }

    const product = dbByTitle[key][0];
    const sorted = [...listing.images].sort((a, b) => a.rank - b.rank);
    console.log(`\n--- ${title} (${product.slug}) ---`);

    const productImages = [];
    for (const img of sorted) {
      try {
        const buf = await downloadImage(img.url_fullxfull);
        const fp = await getFingerprint(buf);
        if (isExplainer(fp, explainerFPs)) {
          totalSkipped++;
        } else {
          productImages.push({ rank: img.rank, buffer: buf });
        }
      } catch (err) {
        console.error(`  rank ${img.rank}: ERROR - ${err.message}`);
        errors.push({ title, rank: img.rank, error: err.message });
      }
    }

    console.log(`  ${productImages.length} product / ${sorted.length - productImages.length} explainer`);

    if (productImages.length === 0) continue;

    try {
      // Cover image
      const coverFileName = await uploadImage(productImages[0].buffer, product.slug, 'cover');
      await db.execute('UPDATE Product SET mainImage = ? WHERE id = ?', [coverFileName, product.id]);
      totalUploaded++;

      // Gallery images
      for (let i = 1; i < productImages.length; i++) {
        const fileName = await uploadImage(productImages[i].buffer, product.slug, productImages[i].rank);
        const imageID = require('crypto').randomUUID();
        await db.execute('INSERT INTO Image (imageID, productID, image) VALUES (?, ?, ?)', [imageID, product.id, fileName]);
        totalUploaded++;
      }
    } catch (err) {
      console.error(`  Upload error: ${err.message}`);
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

  await db.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
