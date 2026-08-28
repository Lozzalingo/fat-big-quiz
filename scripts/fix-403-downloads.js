#!/usr/bin/env node
/**
 * Fix 403 Downloads - Re-upload files that return 403 from CDN
 */

require(require('path').join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: require('path').join(__dirname, '..', 'server', '.env'),
});

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://fatbigquiz.com/api';

const SEARCH_DIRS = [
  '/Users/laurencestephan/Downloads',
  '/Users/laurencestephan/Downloads/uploaded',
];

const FIXES = [
  {
    id: 'b21cbc36-0c88-495a-891a-bad5ad1e7234',
    title: 'Printable Cereal Picture Quiz Easy Level',
    files: [
      'Printable Cereal Picture Quiz Easy Level ColouredQuestionsEasy.pdf',
      'Printable Cereal Picture Quiz Easy Level EasyAnswers.pdf',
      'Printable Cereal Picture Quiz Easy Level LowInkQuestionsEasy.pdf',
    ],
  },
  {
    id: '64d98eeb-9342-4861-ba77-747ffea8e2e3',
    title: 'Printable Chocolate Picture Quiz Easy Level',
    files: [
      'ChocolatePictureQuizMixedColouredQuestions.pdf',
      'ChocolatePictureQuizMixedAnswers.pdf.pdf',
      'ChocolatePictureQuizMixedLowInkQuestionscopy.pdf',
    ],
  },
];

function findLocalFile(filename) {
  for (const dir of SEARCH_DIRS) {
    const fullPath = path.join(dir, filename);
    if (fs.existsSync(fullPath)) return fullPath;
  }
  return null;
}

async function main() {
  const { uploadToSpaces } = require('../server/utils/spaces');

  for (const fix of FIXES) {
    console.log(`[Fix403] ${fix.title}`);
    const uploadedNames = [];

    for (const file of fix.files) {
      const localPath = findLocalFile(file);
      if (!localPath) {
        console.error(`[Fix403]   MISSING: ${file}`);
        continue;
      }
      const buffer = fs.readFileSync(localPath);
      const result = await uploadToSpaces(buffer, file, 'downloads', 'application/pdf');
      console.log(`[Fix403]   Uploaded: ${file} -> ${result.fileName}`);
      uploadedNames.push(result.fileName);
    }

    // Update product
    const res = await fetch(`${API_BASE}/products/${fix.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadFile: JSON.stringify(uploadedNames) }),
    });

    if (res.ok) {
      console.log(`[Fix403]   Product updated with ${uploadedNames.length} files`);
    } else {
      console.error(`[Fix403]   Update failed: ${res.status}`);
    }
    console.log('');
  }

  console.log('[Fix403] Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
