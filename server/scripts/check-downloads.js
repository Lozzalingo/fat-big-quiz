/**
 * Check all product download files in DB against what exists in S3.
 * Reports mismatches, missing files, and orphaned S3 files.
 *
 * Usage: node scripts/check-downloads.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');

const prisma = new PrismaClient();
const s3 = new S3Client({
  region: process.env.DO_SPACES_REGION || 'sfo3',
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://sfo3.digitaloceanspaces.com',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const BUCKET = process.env.DO_SPACES_BUCKET || 'aitshirts-laurence-dot-computer';
const FOLDER = process.env.DO_SPACES_FOLDER || 'fat-big-quiz';
const PREFIX = `${FOLDER}/downloads/`;

async function listAllS3Files() {
  const files = new Map();
  let continuationToken;

  do {
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });
    const res = await s3.send(cmd);
    if (res.Contents) {
      for (const obj of res.Contents) {
        const filename = obj.Key.replace(PREFIX, '');
        files.set(filename, { size: obj.Size, key: obj.Key });
      }
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return files;
}

async function run() {
  console.log('[Check] Scanning products with download files...\n');

  // Get all products with downloadFile set
  const products = await prisma.product.findMany({
    where: { downloadFile: { not: null } },
    select: { id: true, title: true, slug: true, downloadFile: true, inStock: true },
  });

  // Get all S3 files
  console.log('[Check] Listing S3 files in', PREFIX);
  const s3Files = await listAllS3Files();
  console.log(`[Check] Found ${s3Files.size} files in S3\n`);

  const dbFilenames = new Set();
  const missing = [];
  const found = [];
  const parseErrors = [];

  for (const product of products) {
    let files = [];
    try {
      const parsed = JSON.parse(product.downloadFile);
      files = Array.isArray(parsed) ? parsed : [product.downloadFile];
    } catch {
      files = [product.downloadFile];
    }

    // Skip empty
    files = files.filter(f => f && f.trim());

    for (const filename of files) {
      dbFilenames.add(filename);

      if (s3Files.has(filename)) {
        const s3Info = s3Files.get(filename);
        found.push({
          product: product.title,
          slug: product.slug,
          filename,
          size: s3Info.size,
          inStock: product.inStock,
        });
      } else {
        missing.push({
          product: product.title,
          slug: product.slug,
          productId: product.id,
          filename,
          inStock: product.inStock,
        });
      }
    }
  }

  // Orphaned S3 files (in S3 but not referenced by any product)
  const orphaned = [];
  for (const [filename, info] of s3Files) {
    if (!dbFilenames.has(filename)) {
      orphaned.push({ filename, size: info.size });
    }
  }

  // Also check global bonus files
  const globalPrefix = `${FOLDER}/global-bonus/`;
  const globalCmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: globalPrefix, MaxKeys: 100 });
  const globalRes = await s3.send(globalCmd);
  const s3GlobalFiles = new Map();
  if (globalRes.Contents) {
    for (const obj of globalRes.Contents) {
      s3GlobalFiles.set(obj.Key.replace(globalPrefix, ''), { size: obj.Size });
    }
  }

  const globalDbFiles = await prisma.globalDownloadFile.findMany({ where: { isActive: true } });
  const missingGlobal = [];
  for (const gf of globalDbFiles) {
    if (!s3GlobalFiles.has(gf.fileName)) {
      missingGlobal.push({ title: gf.title, filename: gf.fileName });
    }
  }

  // Print results
  console.log('='.repeat(70));
  console.log(' DOWNLOAD FILE AUDIT');
  console.log('='.repeat(70));

  console.log(`\nProducts with downloads: ${products.length}`);
  console.log(`DB file references: ${dbFilenames.size}`);
  console.log(`S3 files: ${s3Files.size}`);
  console.log(`Matched: ${found.length}`);
  console.log(`Missing from S3: ${missing.length}`);
  console.log(`Orphaned in S3: ${orphaned.length}`);

  if (missing.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log(' MISSING FROM S3 (DB references file that does not exist)');
    console.log('-'.repeat(70));
    for (const m of missing) {
      const stockLabel = m.inStock >= 1 ? 'IN STOCK' : 'out of stock';
      console.log(`  [${stockLabel}] ${m.product}`);
      console.log(`    DB file: ${m.filename}`);
      console.log(`    ID: ${m.productId}`);
      console.log('');
    }
  }

  if (missingGlobal.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log(' MISSING GLOBAL BONUS FILES');
    console.log('-'.repeat(70));
    for (const m of missingGlobal) {
      console.log(`  ${m.title}: ${m.filename}`);
    }
  }

  if (orphaned.length > 0) {
    console.log('\n' + '-'.repeat(70));
    console.log(` ORPHANED IN S3 (file exists but no product references it)`);
    console.log('-'.repeat(70));
    for (const o of orphaned) {
      const sizeMB = (o.size / 1024 / 1024).toFixed(1);
      console.log(`  ${o.filename} (${sizeMB} MB)`);
    }
  }

  if (missing.length === 0 && missingGlobal.length === 0) {
    console.log('\n  All download files are present in S3.');
  }

  console.log('\n' + '='.repeat(70));

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error('[Check] Fatal error:', err.message);
  process.exit(1);
});
