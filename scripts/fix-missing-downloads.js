#!/usr/bin/env node
/**
 * Fix Missing Downloads
 *
 * Uploads missing download files to DO Spaces and updates the live product records.
 * Targets the 15 products that have no downloadFile set.
 *
 * Usage:
 *   node scripts/fix-missing-downloads.js --dry-run   # preview only
 *   node scripts/fix-missing-downloads.js              # upload and update
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────────────
const API_BASE = process.env.API_BASE || 'https://fatbigquiz.com/api';
const DRY_RUN = process.argv.includes('--dry-run');

const SEARCH_DIRS = [
  '/Users/laurencestephan/Downloads',
  '/Users/laurencestephan/Downloads/uploaded',
];

// Products missing downloads: product ID -> expected files
const MISSING_PRODUCTS = [
  {
    id: 'f77257a0-c04f-49bf-99d2-bb1c228e06c3',
    title: 'Printable Summer Scavenger Hunt Game',
    files: ['PrintableScavengerHuntsInstructions.pdf', 'EasterScavengerHuntPrintable.pdf'],
  },
  {
    id: 'ed160120-2008-4136-b0f1-a5be609b6b4a',
    title: 'Printable Guy Fawkes Scavenger Hunt Game',
    files: ['PrintableScavengerHuntsInstructions.pdf', 'EasterScavengerHuntPrintable.pdf'],
  },
  {
    id: '06060ae7-29a0-4883-ab58-3756abb6bc52',
    title: 'Printable Footballer Dingbats Quiz 1',
    files: ['FootballDingbatsAnswerSheet.pdf', 'FootballDingbats.pdf'],
  },
  {
    id: '4441931c-6911-4b96-886f-f1b1d6f9f369',
    title: 'Christmas Music Quiz Name The Artist (Powerpoint)',
    files: ['AnswerSheet-HostInstructions.pdf', 'ChristmasNameTheArtist.pptx'],
  },
  {
    id: '08af156c-cddd-44f0-9c06-81979765b6fb',
    title: 'Editable Printable Halloween Quiz Template (Microsoft Word)',
    files: ['HalloweenQuizTemplate.docx'],
  },
  {
    id: '34064ce1-2c2a-4381-9fb9-a2fdf0d49ccb',
    title: 'Editable Printable Christmas Quiz Template (Microsoft Word)',
    files: ['ChristmasQuizTemplate.docx'],
  },
  {
    id: 'ac31758c-44d6-4fcc-a8c9-a0547967ea63',
    title: 'World Flag Quiz Pack Set 2',
    files: ['WorldFlagPictureQuiz2.pdf'],
  },
  {
    id: 'b995d00a-9606-4ef4-9b1a-0ecfc80c090d',
    title: 'World Flag Quiz Pack Set 3',
    files: ['WorldFlagPictureQuiz3.pdf'],
  },
  {
    id: '187c2642-9f00-41bb-8ae2-569f8225e65f',
    title: 'Editable Printable Easter Quiz Template (Microsoft Word)',
    files: ['EasterQuizTemplate.docx'],
  },
  {
    id: '5be25d85-a990-4dbb-830a-15434b737e2a',
    title: 'Editable Printable Seasonal Quiz Template Pack (Microsoft Word)',
    files: ['ValentinesQuizTemplate.docx', 'SpringQuizTemplate.docx', 'EasterQuizTemplate.docx', 'HalloweenQuizTemplate.docx', 'ChristmasQuizTemplate.docx'],
  },
  {
    id: '2aed887b-5904-4b69-ba89-3b84fbb226db',
    title: 'Editable Printable English Football Quiz Template (Microsoft Word)',
    files: ['FootballQuizTemplate.docx'],
  },
  {
    id: '6c62652b-a24f-4f4f-936d-e57d8bcb1f74',
    title: "Editable Printable Valentine's Quiz Template (Microsoft Word)",
    files: ['ValentinesQuizTemplate.docx'],
  },
  {
    id: '514cabee-a54a-42c6-9a84-7d781c3ad870',
    title: 'Printable World Cup Football Quiz Questions',
    files: ['WorldCupFootballQuizAnswers.pdf', 'WorldCupFootballQuizQuestions.pdf'],
  },
  {
    id: '5766c7f5-5746-4bd3-8ffa-b30a5c660d0a',
    title: 'Christmas Music Quiz Name That Tune (Powerpoint)',
    files: ['ChristmasNameThatTune.pptx', 'AnswerSheet-HostInstructions.pdf'],
  },
  {
    id: '01af08ac-8faa-4f22-bdb8-748cfe68ace8',
    title: 'Christmas Music Quiz Name The Theme Tune (Powerpoint)',
    files: ['ChristmasNameThatTune.pptx', 'AnswerSheet-HostInstructions.pdf'],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function findLocalFile(filename) {
  for (const dir of SEARCH_DIRS) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

async function uploadFileToSpaces(localPath, fileName) {
  const { uploadToSpaces } = require('../server/utils/spaces');
  const buffer = fs.readFileSync(localPath);
  const contentType = getMimeType(fileName);
  const result = await uploadToSpaces(buffer, fileName, 'downloads', contentType);
  console.log(`[Fix] Uploaded: ${fileName} -> ${result.fileName}`);
  return result;
}

async function updateProduct(productId, downloadFileJson) {
  const res = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      downloadFile: downloadFileJson,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('[Fix] Starting missing downloads fix');
  console.log('[Fix] Dry run:', DRY_RUN);
  console.log('[Fix] API:', API_BASE);
  console.log('[Fix] Products to fix:', MISSING_PRODUCTS.length);
  console.log('');

  let fixed = 0;
  let errors = 0;

  for (const product of MISSING_PRODUCTS) {
    console.log(`[Fix] ${product.title}`);
    console.log(`[Fix]   ID: ${product.id}`);
    console.log(`[Fix]   Files: ${product.files.length}`);

    // Find all local files
    const localFiles = [];
    let allFound = true;
    for (const file of product.files) {
      const localPath = findLocalFile(file);
      if (localPath) {
        localFiles.push({ name: file, path: localPath });
        console.log(`[Fix]   Found: ${file}`);
      } else {
        console.error(`[Fix]   MISSING: ${file}`);
        allFound = false;
      }
    }

    if (!allFound) {
      console.error(`[Fix]   SKIPPING - not all files found`);
      errors++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`[Fix]   Would upload ${localFiles.length} files and update product`);
      fixed++;
      continue;
    }

    try {
      // Upload each file to Spaces
      const uploadedFileNames = [];
      for (const file of localFiles) {
        const result = await uploadFileToSpaces(file.path, file.name);
        uploadedFileNames.push(result.fileName);
      }

      // Update product with download file list
      const downloadFileJson = JSON.stringify(uploadedFileNames);
      await updateProduct(product.id, downloadFileJson);
      console.log(`[Fix]   Updated product with ${uploadedFileNames.length} downloads`);
      fixed++;
    } catch (err) {
      console.error(`[Fix]   ERROR: ${err.message}`);
      errors++;
    }

    console.log('');
  }

  console.log('[Fix] ═══════════════════════════════════════');
  console.log('[Fix] Done!');
  console.log(`[Fix]   Fixed: ${fixed}`);
  console.log(`[Fix]   Errors: ${errors}`);
  console.log('[Fix] ═══════════════════════════════════════');
}

main().catch(err => {
  console.error('[Fix] Fatal error:', err);
  process.exit(1);
});
