/**
 * Patch images in migrated blog posts.
 *
 * Replaces broken Wix static URLs with existing DO Spaces CDN URLs.
 * The images were uploaded during a previous migration run but Wix now
 * returns 403, so the latest migration fell back to Wix URLs.
 *
 * Usage (run inside fatbigquiz_api container):
 *   node /app/patch-images.js --dry-run   # Preview changes
 *   node /app/patch-images.js             # Apply changes
 */

const path = require("path");
const SERVER_DIR = "/app";

require(path.join(SERVER_DIR, "node_modules/dotenv")).config({
  path: path.join(SERVER_DIR, ".env"),
});

const { PrismaClient } = require(path.join(SERVER_DIR, "node_modules/@prisma/client"));
const { S3Client, ListObjectsV2Command } = require(path.join(SERVER_DIR, "node_modules/@aws-sdk/client-s3"));

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const CDN_BASE = process.env.DO_SPACES_CDN_ENDPOINT || "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com";
const BUCKET = process.env.DO_SPACES_BUCKET || "aitshirts-laurence-dot-computer";
const FOLDER = process.env.DO_SPACES_FOLDER || "fat-big-quiz";

const s3 = new S3Client({
  region: process.env.DO_SPACES_REGION || "sfo3",
  endpoint: process.env.DO_SPACES_ENDPOINT || "https://sfo3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

/**
 * List all objects in DO Spaces under fat-big-quiz/blog/
 */
async function listCdnImages() {
  const images = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `${FOLDER}/blog/`,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    if (res.Contents) images.push(...res.Contents);
    token = res.NextContinuationToken;
  } while (token);
  return images;
}

/**
 * Build a mapping from sanitised Wix image ID to CDN URL.
 *
 * CDN naming: {sanitised_wix_id}_{timestamp}.{ext}
 * We strip the _TIMESTAMP suffix to get the base name, which maps
 * back to the original Wix image ID (with ~ replaced by _).
 */
function buildImageMap(cdnObjects) {
  // Map: sanitised base name (without timestamp) -> CDN URL
  const map = {};

  for (const obj of cdnObjects) {
    const fileName = path.basename(obj.Key);
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext);

    // Strip the _TIMESTAMP suffix (13-digit epoch)
    const match = baseName.match(/^(.+)_(\d{13})$/);
    if (match) {
      const originalBase = match[1];
      const cdnUrl = `${CDN_BASE}/${obj.Key}`;
      // Store all matches; prefer latest (highest timestamp)
      if (!map[originalBase] || match[2] > (map[originalBase].ts || "0")) {
        map[originalBase] = { url: cdnUrl, ts: match[2] };
      }
    }
  }

  return map;
}

/**
 * Given a Wix image URL, find the matching CDN URL.
 */
function findCdnUrl(wixUrl, imageMap) {
  // Extract the image ID from the Wix URL
  // e.g. https://static.wixstatic.com/media/51dcb4_d9c9b14b4b3b4d9d804090190821f0ba~mv2.png
  const match = wixUrl.match(/\/media\/(.+)$/);
  if (!match) return null;

  const wixImageId = match[1]; // e.g. 51dcb4_d9c...~mv2.png
  const ext = path.extname(wixImageId);
  const baseName = path.basename(wixImageId, ext);

  // Sanitise the same way the upload script did
  const sanitised = baseName.replace(/[^a-zA-Z0-9-_]/g, "_");

  const entry = imageMap[sanitised];
  if (entry) return entry.url;

  // Try with extension included in sanitisation (some edge cases)
  const sanitisedWithExt = wixImageId.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.[^.]+$/, "");
  const entry2 = imageMap[sanitisedWithExt];
  if (entry2) return entry2.url;

  return null;
}

async function main() {
  console.log("============================================================");
  console.log("Patch Images - Replace Wix URLs with CDN URLs");
  console.log("============================================================");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log();

  // Step 1: List all CDN images
  console.log("[CDN] Listing images on DO Spaces...");
  const cdnObjects = await listCdnImages();
  console.log(`[CDN] Found ${cdnObjects.length} images`);

  // Step 2: Build mapping
  const imageMap = buildImageMap(cdnObjects);
  console.log(`[Map] Built mapping for ${Object.keys(imageMap).length} unique base names`);
  console.log();

  // Step 3: Get all blog posts
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, content: true, coverImage: true },
  });
  console.log(`[DB] Found ${posts.length} blog posts`);

  let patchedPosts = 0;
  let replacedUrls = 0;
  let missedUrls = 0;
  let coversPatch = 0;

  for (const post of posts) {
    let content = post.content;
    let changed = false;

    // Find all Wix image URLs in content
    const wixUrlPattern = /https?:\/\/static\.wixstatic\.com\/media\/[^\s"'<>]+/g;
    const wixUrls = content.match(wixUrlPattern) || [];

    for (const wixUrl of wixUrls) {
      const cdnUrl = findCdnUrl(wixUrl, imageMap);
      if (cdnUrl) {
        content = content.replace(wixUrl, cdnUrl);
        replacedUrls++;
        changed = true;
      } else {
        missedUrls++;
        if (DRY_RUN) {
          console.log(`  [Miss] ${post.slug}: ${wixUrl}`);
        }
      }
    }

    // Try to set cover image if missing
    let coverImage = post.coverImage;
    if (!coverImage && wixUrls.length > 0) {
      // Use the first image as cover
      const firstCdn = findCdnUrl(wixUrls[0], imageMap);
      if (firstCdn) {
        // Extract just the filename for cover (DB stores filename, not full URL)
        coverImage = path.basename(firstCdn);
        coversPatch++;
        changed = true;
      }
    }

    if (changed) {
      patchedPosts++;
      if (!DRY_RUN) {
        await prisma.blogPost.update({
          where: { id: post.id },
          data: {
            content,
            coverImage,
          },
        });
      }
      if (DRY_RUN) {
        console.log(`[Patch] ${post.slug}: ${wixUrls.length} Wix URLs found`);
      }
    }
  }

  console.log();
  console.log("============================================================");
  console.log("Patch Complete");
  console.log("============================================================");
  console.log(`Posts patched:     ${patchedPosts}`);
  console.log(`URLs replaced:     ${replacedUrls}`);
  console.log(`URLs not matched:  ${missedUrls}`);
  console.log(`Covers set:        ${coversPatch}`);
  if (DRY_RUN) console.log("\n(Dry run - no changes written)");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
