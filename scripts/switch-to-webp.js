#!/usr/bin/env node
/**
 * Switch blog image references from original formats to WebP.
 *
 * Updates:
 *   1. BlogPost.coverImage (filename field) - .png/.jpg/.jpeg -> .webp
 *   2. BlogPost.content (HTML body) - inline image URLs .png/.jpg/.jpeg -> .webp
 *
 * Usage:
 *   node scripts/switch-to-webp.js              # Full update
 *   node scripts/switch-to-webp.js --dry-run    # Preview only
 *   node scripts/switch-to-webp.js --revert     # Switch back to originals
 *
 * Prerequisites:
 *   - MySQL running with fat_big_quiz database
 *   - cd server && npx prisma generate
 */

const path = require("path");

const SERVER_DIR = path.join(__dirname, "../server");

require(path.join(SERVER_DIR, "node_modules/dotenv")).config({
  path: path.join(SERVER_DIR, ".env"),
});

const { PrismaClient } = require(path.join(
  SERVER_DIR,
  "node_modules/@prisma/client"
));

const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const REVERT = process.argv.includes("--revert");

// CDN base URL pattern to match in HTML content
const CDN_PATTERN =
  /https:\/\/aitshirts-laurence-dot-computer\.sfo3\.cdn\.digitaloceanspaces\.com\/[^"'\s]+\.(png|jpg|jpeg)/gi;

function swapExtension(filename, toWebp = true) {
  if (!filename) return filename;
  if (toWebp) {
    return filename.replace(/\.(png|jpg|jpeg)$/i, ".webp");
  } else {
    // Revert: we don't know the original extension, but we stored it
    // This only works for coverImage, not inline content
    return filename;
  }
}

function swapContentUrls(html, toWebp = true) {
  if (!html) return { html, count: 0 };
  let count = 0;

  if (toWebp) {
    const updated = html.replace(CDN_PATTERN, (match) => {
      count++;
      return match.replace(/\.(png|jpg|jpeg)$/i, ".webp");
    });
    return { html: updated, count };
  } else {
    // Revert: .webp back to original - we can't know the original extension
    // So revert needs a mapping. For now, skip content revert.
    return { html, count: 0 };
  }
}

async function main() {
  console.log(`[WebP Switch] Mode: ${DRY_RUN ? "DRY RUN" : REVERT ? "REVERT" : "LIVE"}`);

  const posts = await prisma.blogPost.findMany({
    select: {
      id: true,
      slug: true,
      coverImage: true,
      content: true,
    },
  });

  console.log(`[WebP Switch] Found ${posts.length} blog posts`);

  let coverUpdated = 0;
  let contentUpdated = 0;
  let totalUrlsSwapped = 0;

  for (const post of posts) {
    const updates = {};
    let changed = false;

    // 1. Cover image
    if (post.coverImage && /\.(png|jpg|jpeg)$/i.test(post.coverImage)) {
      const newCover = swapExtension(post.coverImage, !REVERT);
      if (newCover !== post.coverImage) {
        updates.coverImage = newCover;
        coverUpdated++;
        changed = true;
        if (DRY_RUN) {
          console.log(`[WebP Switch] Cover: ${post.slug}: ${post.coverImage} -> ${newCover}`);
        }
      }
    }

    // 2. Inline content images
    if (post.content) {
      const { html, count } = swapContentUrls(post.content, !REVERT);
      if (count > 0) {
        updates.content = html;
        contentUpdated++;
        totalUrlsSwapped += count;
        changed = true;
        if (DRY_RUN) {
          console.log(`[WebP Switch] Content: ${post.slug}: ${count} URLs swapped`);
        }
      }
    }

    // Apply update
    if (changed && !DRY_RUN) {
      await prisma.blogPost.update({
        where: { id: post.id },
        data: updates,
      });
      console.log(`[WebP Switch] Updated: ${post.slug} (cover: ${"coverImage" in updates}, content URLs: ${totalUrlsSwapped})`);
    }
  }

  console.log(`\n[WebP Switch] Summary:`);
  console.log(`  Cover images updated: ${coverUpdated}`);
  console.log(`  Posts with content URLs updated: ${contentUpdated}`);
  console.log(`  Total inline URLs swapped: ${totalUrlsSwapped}`);

  if (DRY_RUN) {
    console.log(`\n[WebP Switch] DRY RUN complete - no changes made. Run without --dry-run to apply.`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("[WebP Switch] Fatal error:", err);
  prisma.$disconnect();
  process.exit(1);
});
