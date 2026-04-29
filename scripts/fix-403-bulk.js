#!/usr/bin/env node
/**
 * Fix 403 Downloads - Bulk re-upload for 9 products with inaccessible files
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
    id: '04059d29-d986-4d04-b173-7d3adfbe8cd9',
    title: 'Printable Biscuit Picture Quiz Mixed Level',
    files: [
      'Printable Biscuit Picture Quiz Mixed Level ColouredQuestions.pdf',
      ' Printable Biscuit Picture Quiz Mixed Level LowInkQuestions.pdf.pdf',
      'Printable Biscuit Picture Quiz Mixed Level Answers.pdf',
    ],
  },
  {
    id: '9db98410-2458-4796-8d6b-d191fc84275c',
    title: 'Mixed Printable Confectionery Picture Quiz Pack (Mixed Difficulty Level)',
    files: [
      'Questions-PrintableConfectioneryPictureQuizPackMixedLevel.pdf',
      'Answers-PrintableConfectioneryPictureQuizPackMixedLevel.pdf',
      'LowInkQuestions-PrintableConfectioneryPictureQuizPackEasyLevel.pdf',
    ],
  },
  {
    id: '1e38ea24-8abf-4a8d-b92f-67a119ce6e9d',
    title: 'Easy Printable Confectionery Picture Quiz Pack (Easy Difficulty Level)',
    files: [
      'LowInkQuestions-PrintableConfectioneryPictureQuizPackMixedLevel.pdf',
      'Questions-PrintableConfectioneryPictureQuizPackEasyLevel.pdf',
      '1-4Answers-PrintableConfectioneryPictureQuizPackEasyLevel.pdf',
      '4-8Answers-PrintableConfectioneryPictureQuizPackEasyLevel.pdf',
    ],
  },
  {
    id: '46830dd3-d28f-4333-abc5-a300ffe66891',
    title: 'Printable Chocolate Picture Quiz Mixed Level',
    files: [
      'ChocolatePictureQuizEasyColouredQuestions.pdf',
      'ChocolatePictureQuizEasyAnswers.pdf',
      'ChocolatePictureQuizEasyLowInkQuestions.pdf',
    ],
  },
  {
    id: '53d6f3cf-a0bf-462c-93d4-48c021a755f5',
    title: 'Printable Sweets Picture Quiz Easy Level',
    files: [
      'ColouredSweetsPictureQuizEasy.pdf',
      'SweetsPictureQuizEasyLowInkQuestions.pdf',
      'SweetsPictureQuizEasyAnswers.pdf',
    ],
  },
  {
    id: '67e763b2-e675-4d8c-95f7-143e03a9ab9d',
    title: 'Printable Sweets Picture Quiz Mixed Level',
    files: [
      'ColouredSweetsPictureQuizMixed.pdf',
      'SweetsPictureQuizMixedAnswers.pdf',
      'SweetsPictureQuizMixedLowInkQuestions.pdf',
    ],
  },
  {
    id: 'eb7efbec-0371-4fa2-b590-a1787a55fcdf',
    title: 'Printable Cereal Picture Quiz Mixed Level',
    files: [
      'Printable Cereal Picture Quiz Mixed Level ColouredQuestionsMixed.pdf',
      'Printable Cereal Picture Quiz Mixed Level MixedAnswers.pdf',
      ' Printable Cereal Picture Quiz Mixed Level LowInkQuestionsMixed.pdf',
    ],
  },
  {
    id: 'c8dc12df-8b27-40fd-8a7b-4d3686ade92b',
    title: 'Printable Crisp Picture Quiz Mixed Level',
    files: [
      'CrispsPictureQuizMixedColouredQuestions.pdf',
      'CrispsMixedAnswers.pdf',
      'CrispsPictureQuizMixedLowInkQuestions.pdf',
    ],
  },
  {
    id: 'cb28333b-a213-41e3-ba4c-8fad8d8715ef',
    title: 'Printable Crisp Picture Quiz Easy Level',
    files: [
      'CrispsPictureQuizEasyColouredQuestions.pdf',
      'CrispsEasyAnswers.pdf',
      'CrispsPictureQuizEasyLowInkQuestions.pdf',
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

  let fixed = 0;
  let errors = 0;

  for (const fix of FIXES) {
    console.log(`[Fix403] ${fix.title}`);
    const uploadedNames = [];

    for (const file of fix.files) {
      const localPath = findLocalFile(file);
      if (!localPath) {
        console.error(`[Fix403]   MISSING: ${file}`);
        errors++;
        continue;
      }
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(file).toLowerCase();
      const mimeMap = {
        '.pdf': 'application/pdf',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      const result = await uploadToSpaces(buffer, file, 'products/downloads', mimeMap[ext] || 'application/pdf');
      console.log(`[Fix403]   Uploaded: ${file} -> ${result.fileName}`);
      uploadedNames.push(result.fileName);
    }

    if (uploadedNames.length === 0) {
      console.error(`[Fix403]   No files uploaded, skipping update`);
      errors++;
      continue;
    }

    const res = await fetch(`${API_BASE}/products/${fix.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ downloadFile: JSON.stringify(uploadedNames) }),
    });

    if (res.ok) {
      console.log(`[Fix403]   Updated with ${uploadedNames.length} files`);
      fixed++;
    } else {
      console.error(`[Fix403]   Update failed: ${res.status}`);
      errors++;
    }
    console.log('');
  }

  console.log(`[Fix403] Done! Fixed: ${fixed}, Errors: ${errors}`);
}

main().catch(err => { console.error(err); process.exit(1); });
