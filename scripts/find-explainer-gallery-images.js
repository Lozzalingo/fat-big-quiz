#!/usr/bin/env node
/**
 * Find gallery images that are actually explainer images on PRODUCTION.
 * Downloads each from CDN, compares against known explainer fingerprints.
 * Outputs SQL DELETE statements for the matches.
 */

const sharp = require('sharp');
const fs = require('fs');

const CDN_BASE = 'https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com/fat-big-quiz';
const THUMB_SIZE = 32;
const MSE_THRESHOLD = 800;

async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`${resp.status}`);
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
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return sum / a.length;
}

async function main() {
  // Fingerprint the 5 CDN explainers + the Etsy "How to Download"
  console.error('[Setup] Fingerprinting explainer images...');
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
    console.error(`  ${f}`);
  }
  // 6th: Etsy "How to Download"
  const htdBuf = await downloadImage('https://i.etsystatic.com/33166950/r/il/dc0b78/7517222851/il_fullxfull.7517222851_oic1.jpg');
  explainerFPs.push(await getFingerprint(htdBuf));
  console.error('  Etsy How to Download');
  console.error(`[Setup] ${explainerFPs.length} fingerprints ready\n`);

  // Read gallery images from TSV
  const lines = fs.readFileSync('/tmp/prod-gallery-images.tsv', 'utf8').trim().split('\n');
  console.error(`[Info] ${lines.length} gallery images to check\n`);

  const toDelete = [];
  let checked = 0;

  for (const line of lines) {
    const [imageID, filename] = line.split('\t');
    const url = `${CDN_BASE}/products/images/${filename}`;

    try {
      const buf = await downloadImage(url);
      const fp = await getFingerprint(buf);
      const minMSE = Math.min(...explainerFPs.map(e => mse(fp, e)));

      if (minMSE < MSE_THRESHOLD) {
        toDelete.push(imageID);
        console.error(`  EXPLAINER: ${filename} (MSE: ${Math.round(minMSE)})`);
      }
    } catch (err) {
      console.error(`  ERROR: ${filename} - ${err.message}`);
    }

    checked++;
    if (checked % 50 === 0) console.error(`[Progress] ${checked}/${lines.length}`);
  }

  console.error(`\n[Result] ${toDelete.length} explainer images to delete out of ${lines.length}`);

  // Output SQL
  if (toDelete.length > 0) {
    // Batch into groups of 50
    for (let i = 0; i < toDelete.length; i += 50) {
      const batch = toDelete.slice(i, i + 50);
      const ids = batch.map(id => `'${id}'`).join(',');
      console.log(`DELETE FROM Image WHERE imageID IN (${ids});`);
    }
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
