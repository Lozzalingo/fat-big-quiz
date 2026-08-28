#!/usr/bin/env node
/**
 * Fix Missing Downloads - Phase 2
 *
 * Adds missing shared/instruction files to products that already have some downloads.
 * Does NOT replace existing downloads - appends to them.
 *
 * Usage:
 *   node scripts/fix-missing-downloads-2.js --dry-run
 *   node scripts/fix-missing-downloads-2.js
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'https://fatbigquiz.com/api';
const DRY_RUN = process.argv.includes('--dry-run');

const SEARCH_DIRS = [
  '/Users/laurencestephan/Downloads',
  '/Users/laurencestephan/Downloads/uploaded',
];

// Products needing additional files appended
const FIXES = [
  {
    id: 'cf7a68ac-6972-492f-9a9e-fc743b204bda',
    title: 'Christmas Music Quiz Song In Reverse (Powerpoint)',
    addFiles: ['AnswerSheet-HostInstructions.pdf'],
  },
  {
    id: '95ed5920-fd39-4b1c-9dda-f7386d65ae47',
    title: 'Printable Autumn Scavenger Hunt Game',
    addFiles: ['PrintableScavengerHuntsInstructions.pdf'],
  },
  {
    id: 'fe0cf054-7ca8-481d-9420-54e51a0d748d',
    title: "Printable Valentine's Scavenger Hunt Game",
    addFiles: ['PrintableScavengerHuntsInstructions.pdf'],
  },
  {
    id: '44e34346-734b-41d7-aa81-4faffaf3a1c8',
    title: 'Printable Scavenger Hunt Game Mix Pack',
    addFiles: ['PrintableScavengerHuntsInstructions.pdf'],
  },
  {
    id: 'eeaa30f8-0ec8-4c83-a951-78bdee5d785c',
    title: 'Printable Christmas Scavenger Hunt Game',
    addFiles: ['PrintableScavengerHuntsInstructions.pdf'],
  },
  {
    id: '4ed7af34-f82b-4349-81ea-8867d227a16b',
    title: 'Printable Halloween Scavenger Hunt Game',
    addFiles: ['PrintableScavengerHuntsInstructions.pdf'],
  },
  {
    id: '2f0bbcb8-2153-4ed9-8bff-1bdede5225de',
    title: 'Scavenger Hunt Bachelorette/Hen Party',
    addFiles: ['PrintableScavengerHuntInstructions.pdf'],
  },
  {
    id: 'a7ce0275-29cc-434f-8dd2-e096d40e35a5',
    title: 'The Ultimate Printable World Flag Quiz Pack (12 Quizzes)',
    addFiles: ['WorldFlagPictureQuiz1.pdf'],
  },
  {
    id: 'adf83cf6-449c-46b7-9a92-764d29e72f6e',
    title: 'Christmas Music Quiz Pack',
    addFiles: ['ChristmasSongInReverse.pptx', 'AnswerSheet-HostInstructionsMusicPack.pdf'],
  },
  {
    id: '56fe0150-c6aa-494d-8cdb-7852b00b5e2f',
    title: 'Halloween Music Quiz Name That Tune and Artist (Powerpoint)',
    addFiles: ['AnswerSheet-HostInstructions.pdf'],
  },
  {
    id: '595489b4-e2d4-4946-8387-759d426c72e4',
    title: 'Halloween Music Quiz Name The Theme Tune (Powerpoint)',
    addFiles: ['AnswerSheet-HostInstructions.pdf'],
  },
  {
    id: 'f5be8a7e-cb54-461c-aafd-d22f0b28f031',
    title: 'Printable Spring Character Picture Quiz Easy Level',
    addFiles: ['SpringQuizTemplate.docx'],
  },
  {
    id: '9d9c34aa-9dd4-454f-8fa7-7f4b50ba2c10',
    title: 'The Ultimate Printable Continental World Flag Quiz Pack (16 Quizzes)',
    addFiles: ['AfricanFlagPictureQuizPack.pdf', 'AsianFlagPictureQuizPack.pdf', 'EuropeanFlagPictureQuizPack.pdf', 'NorthAmericanFlagPictureQuizPack.pdf'],
  },
  {
    id: '1ead6813-838e-4789-a74d-e988767de81e',
    title: 'Printable High Street Brands Dingbats Quiz',
    addFiles: ['HighStreetBrandsDingbatsAnswerSheet.pdf'],
  },
];

function findLocalFile(filename) {
  for (const dir of SEARCH_DIRS) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }[ext] || 'application/octet-stream';
}

async function uploadFileToSpaces(localPath, fileName) {
  const { uploadToSpaces } = require('../server/utils/spaces');
  const buffer = fs.readFileSync(localPath);
  const result = await uploadToSpaces(buffer, fileName, 'downloads', getMimeType(fileName));
  console.log(`[Fix2] Uploaded: ${fileName} -> ${result.fileName}`);
  return result;
}

async function getProduct(productId) {
  const res = await fetch(`${API_BASE}/products/${productId}`);
  if (!res.ok) throw new Error(`GET failed: ${res.status}`);
  return res.json();
}

async function updateProduct(productId, downloadFileJson) {
  const res = await fetch(`${API_BASE}/products/${productId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ downloadFile: downloadFileJson }),
  });
  if (!res.ok) throw new Error(`PUT failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('[Fix2] Starting phase 2 - appending missing shared files');
  console.log('[Fix2] Dry run:', DRY_RUN);
  console.log('[Fix2] Products to fix:', FIXES.length);
  console.log('');

  let fixed = 0;
  let errors = 0;

  for (const fix of FIXES) {
    console.log(`[Fix2] ${fix.title}`);

    // Get current product to read existing downloads
    const product = await getProduct(fix.id);
    let existingFiles = [];
    if (product.downloadFile) {
      try {
        existingFiles = JSON.parse(product.downloadFile);
        if (!Array.isArray(existingFiles)) existingFiles = [product.downloadFile];
      } catch { existingFiles = [product.downloadFile]; }
    }
    console.log(`[Fix2]   Current downloads: ${existingFiles.length}`);

    // Find and upload missing files
    const newFiles = [...existingFiles];
    let allFound = true;

    for (const file of fix.addFiles) {
      const localPath = findLocalFile(file);
      if (!localPath) {
        console.error(`[Fix2]   MISSING LOCAL: ${file}`);
        allFound = false;
        continue;
      }

      if (DRY_RUN) {
        console.log(`[Fix2]   Would upload: ${file}`);
        newFiles.push(`${file}_DRYRUN`);
      } else {
        try {
          const result = await uploadFileToSpaces(localPath, file);
          newFiles.push(result.fileName);
        } catch (err) {
          console.error(`[Fix2]   Upload error: ${err.message}`);
          allFound = false;
        }
      }
    }

    if (!allFound) {
      console.error(`[Fix2]   SKIPPING - not all files available`);
      errors++;
      continue;
    }

    if (!DRY_RUN) {
      try {
        await updateProduct(fix.id, JSON.stringify(newFiles));
        console.log(`[Fix2]   Updated: ${existingFiles.length} -> ${newFiles.length} files`);
        fixed++;
      } catch (err) {
        console.error(`[Fix2]   Update error: ${err.message}`);
        errors++;
      }
    } else {
      console.log(`[Fix2]   Would update: ${existingFiles.length} -> ${newFiles.length} files`);
      fixed++;
    }
    console.log('');
  }

  console.log('[Fix2] ═══════════════════════════════════════');
  console.log(`[Fix2] Done! Fixed: ${fixed}, Errors: ${errors}`);
  console.log('[Fix2] ═══════════════════════════════════════');
}

main().catch(err => {
  console.error('[Fix2] Fatal error:', err);
  process.exit(1);
});
