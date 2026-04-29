#!/usr/bin/env node
/**
 * Migrate Etsy listings to match fatbigquiz.com shop
 *
 * Tasks:
 * 1. Upload download files to DO Spaces and set downloadFile on products
 * 2. Download missing Etsy images, upload to DO Spaces, add to Image table
 * 3. Update descriptions from Etsy (minus FAQ content)
 */

const path = require('path');
const serverDir = path.join(__dirname, '..', 'server');

// Resolve modules from server/node_modules
const dotenv = require(path.join(serverDir, 'node_modules', 'dotenv'));
dotenv.config({ path: path.join(serverDir, '.env') });

// Add server/node_modules to module search path
module.paths.unshift(path.join(serverDir, 'node_modules'));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const { uploadToSpaces } = require(path.join(serverDir, 'utils', 'spaces'));

const ETSY_JSON = '/Users/laurencestephan/Downloads/tmp/fat big quiz listings.json';
const CSV_FILE = '/Users/laurencestephan/Downloads/tmp/etsy-to-local-file-mapping.csv';
const DOWNLOADS_DIR = '/Users/laurencestephan/Downloads';

// Paragraphs to strip (Etsy-specific or FAQ boilerplate)
const REMOVE_PARAGRAPHS = [
  // Etsy download references
  /^Files are provided in [\w\s,&/]+format and are available for (?:download |instant download ).*$/i,
  /^✨\s*Files are provided in [\w\s,&/]+format and are available for .*$/i,
  /^Please note: Downloads are (?:currently )?not supported via the Etsy app\.?$/i,
  // FAQ block the user specifically wants removed
  /^How do I receive my download\?/i,
  /^After completing your purchase.*download link\.?$/i,
  /^What payment methods do you accept\?/i,
  /^We accept all major credit cards.*through Stripe\.?$/i,
  /^Can I get a refund\?/i,
  /^Due to the digital nature.*if you have issues\.?$/i,
  // Plus signs used as FAQ expanders
  /^\+$/,
];

/**
 * Remove FAQ, Etsy-specific boilerplate, and deduplicate repeated paragraphs
 */
function cleanDescription(desc) {
  if (!desc) return '';

  // Split into paragraphs
  const paragraphs = desc.split('\n\n');
  const kept = [];
  const seen = new Set();

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Check against removal patterns
    const shouldRemove = REMOVE_PARAGRAPHS.some(p => p.test(trimmed));
    if (shouldRemove) continue;

    // Deduplicate identical paragraphs
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    kept.push(trimmed);
  }

  return kept.join('\n\n').trim();
}

/**
 * Parse CSV manually (no external dependency)
 */
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h] = values[i] || '');
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse the CSV file mapping to get download files per listing
 */
function parseFileMapping() {
  const content = fs.readFileSync(CSV_FILE, 'utf8');
  const records = parseCSV(content);

  // Group by listing ID
  const mapping = {};
  for (const row of records) {
    const listingId = row['Etsy Listing ID'].replace(/"/g, '');
    const localFile = row['Local Filename'].trim();
    if (!mapping[listingId]) mapping[listingId] = [];
    mapping[listingId].push(localFile);
  }
  return mapping;
}

/**
 * Upload a file to DO Spaces downloads folder
 */
async function uploadDownloadFile(localFilename) {
  const filePath = path.join(DOWNLOADS_DIR, localFilename);
  if (!fs.existsSync(filePath)) {
    console.error(`[Upload] File not found: ${filePath}`);
    return null;
  }

  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`[Upload] Reading ${localFilename} (${sizeMB}MB)...`);

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(localFilename).toLowerCase();
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  const contentType = contentTypes[ext] || 'application/octet-stream';

  const result = await uploadToSpaces(buffer, localFilename, 'downloads', contentType);
  console.log(`[Upload] Uploaded: ${localFilename} -> ${result.fileName}`);
  return result.fileName;
}

/**
 * Download image from URL and return buffer
 */
async function downloadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Upload an Etsy image to DO Spaces
 */
async function uploadEtsyImage(imageUrl, productSlug, rank) {
  const buffer = await downloadImage(imageUrl);
  const ext = '.jpg';
  const filename = `${productSlug}-${rank}${ext}`;
  const contentType = 'image/jpeg';

  const result = await uploadToSpaces(buffer, filename, 'products/images', contentType);
  console.log(`[Image] Uploaded: ${filename} -> ${result.fileName}`);
  return result.fileName;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDownloads = args.includes('--skip-downloads');
  const skipImages = args.includes('--skip-images');
  const skipDescriptions = args.includes('--skip-descriptions');

  if (dryRun) console.log('=== DRY RUN MODE ===\n');

  // Load data
  const etsyListings = JSON.parse(fs.readFileSync(ETSY_JSON, 'utf8'));
  const fileMapping = parseFileMapping();
  const dbProducts = await prisma.product.findMany({ include: { images: true } });

  // Build title -> product map
  const dbByTitle = {};
  for (const p of dbProducts) {
    const key = p.title.toLowerCase().replace(/[\u2019\u2018]/g, "'").replace(/\u2026/g, '...');
    if (!dbByTitle[key]) dbByTitle[key] = [];
    dbByTitle[key].push(p);
  }

  let downloadsUpdated = 0, descriptionsUpdated = 0, imagesAdded = 0;
  let errors = [];

  for (const listing of etsyListings) {
    const title = listing.title.replace(/&#39;/g, "'");
    const key = title.toLowerCase();
    const listingId = String(listing.listing_id);

    if (!dbByTitle[key]) {
      console.log(`[Skip] No DB match for: ${title}`);
      continue;
    }

    // Use the product with images (canonical one)
    const product = dbByTitle[key].reduce((a, b) => a.images.length >= b.images.length ? a : b);

    console.log(`\n--- ${title} (${product.slug}) ---`);

    // 1. Upload download files
    if (!skipDownloads && !product.downloadFile && fileMapping[listingId]) {
      const files = fileMapping[listingId];
      console.log(`[Downloads] ${files.length} files to upload`);

      if (!dryRun) {
        try {
          const uploadedNames = [];
          for (const file of files) {
            const uploaded = await uploadDownloadFile(file);
            if (uploaded) uploadedNames.push(uploaded);
          }

          if (uploadedNames.length > 0) {
            await prisma.product.update({
              where: { id: product.id },
              data: {
                downloadFile: JSON.stringify(uploadedNames),
                productType: 'DIGITAL_DOWNLOAD'
              }
            });
            downloadsUpdated++;
            console.log(`[Downloads] Set ${uploadedNames.length} download files`);
          }
        } catch (err) {
          console.error(`[Downloads] Error for ${title}:`, err.message);
          errors.push({ title, phase: 'downloads', error: err.message });
        }
      } else {
        console.log(`[Downloads] Would upload: ${files.join(', ')}`);
        downloadsUpdated++;
      }
    } else if (!skipDownloads && product.downloadFile) {
      console.log(`[Downloads] Already has downloads, skipping`);
    }

    // 2. Fix image counts
    // Etsy image count = product-specific images only
    // Quiz format explainer images are added separately on the site, not stored per-product
    if (!skipImages) {
      const etsyImageCount = listing.images.length;
      const dbImageCount = (product.mainImage ? 1 : 0) + product.images.length;

      if (dbImageCount < etsyImageCount) {
        const needed = etsyImageCount - dbImageCount;
        console.log(`[Images] Need ${needed} more product images (DB: ${dbImageCount}, Etsy: ${etsyImageCount})`);

        if (!dryRun) {
          try {
            // Sort Etsy images by rank (rank 1 = cover, rest = gallery)
            const sortedEtsyImages = [...listing.images].sort((a, b) => a.rank - b.rank);

            let remaining = needed;

            // If no mainImage, set rank 1 as mainImage
            if (!product.mainImage && sortedEtsyImages.length > 0) {
              const mainImg = sortedEtsyImages[0];
              const fileName = await uploadEtsyImage(mainImg.url_fullxfull, product.slug, 'cover');
              await prisma.product.update({
                where: { id: product.id },
                data: { mainImage: fileName }
              });
              console.log(`[Images] Set main image`);
              remaining--;
            }

            // For gallery images: existing ones map to ranks 2..N, we need ranks (N+1)..end
            // Skip rank 1 (mainImage), skip ranks we already have, take the rest
            const galleryEtsy = sortedEtsyImages.slice(1); // skip rank 1 (cover)
            const existingGallery = product.images.length;
            const toUpload = galleryEtsy.slice(existingGallery, existingGallery + remaining);

            for (const img of toUpload) {
              const fileName = await uploadEtsyImage(img.url_fullxfull, product.slug, img.rank);
              await prisma.image.create({
                data: {
                  image: fileName,
                  productID: product.id
                }
              });
              imagesAdded++;
            }
            console.log(`[Images] Added ${toUpload.length} gallery images`);
          } catch (err) {
            console.error(`[Images] Error for ${title}:`, err.message);
            errors.push({ title, phase: 'images', error: err.message });
          }
        } else {
          console.log(`[Images] Would add ${needed} images`);
          imagesAdded += needed;
        }
      } else if (dbImageCount > etsyImageCount) {
        // DB has more product images than Etsy - remove the extras
        const excess = dbImageCount - etsyImageCount;
        console.log(`[Images] DB has ${excess} extra images (DB: ${dbImageCount}, Etsy: ${etsyImageCount}) - removing`);

        if (!dryRun) {
          try {
            // Remove the last N gallery images (most recently added / highest rank)
            const toRemove = product.images.slice(-excess);
            for (const img of toRemove) {
              await prisma.image.delete({ where: { imageID: img.imageID } });
              console.log(`[Images] Removed gallery image: ${img.image}`);
            }
          } catch (err) {
            console.error(`[Images] Error removing for ${title}:`, err.message);
            errors.push({ title, phase: 'images-remove', error: err.message });
          }
        }
      }
    }

    // 3. Update description
    if (!skipDescriptions) {
      const etsyDesc = listing.description.replace(/&#39;/g, "'");
      const cleaned = cleanDescription(etsyDesc);

      if (cleaned !== product.description) {
        if (!dryRun) {
          try {
            await prisma.product.update({
              where: { id: product.id },
              data: { description: cleaned }
            });
            descriptionsUpdated++;
            console.log(`[Description] Updated`);
          } catch (err) {
            console.error(`[Description] Error for ${title}:`, err.message);
            errors.push({ title, phase: 'description', error: err.message });
          }
        } else {
          console.log(`[Description] Would update (${product.description?.length || 0} -> ${cleaned.length} chars)`);
          descriptionsUpdated++;
        }
      } else {
        console.log(`[Description] Already matches`);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Downloads updated: ${downloadsUpdated}`);
  console.log(`Images added: ${imagesAdded}`);
  console.log(`Descriptions updated: ${descriptionsUpdated}`);
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    errors.forEach(e => console.log(`  ${e.title} [${e.phase}]: ${e.error}`));
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
