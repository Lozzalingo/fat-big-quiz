/**
 * Wix → Fat Big Quiz Blog Migration
 *
 * Exports quiz blog posts from Wix BucketRace site and imports them
 * into Fat Big Quiz's MySQL database via Prisma.
 *
 * Usage:
 *   node scripts/wix-migration/migrate.js                  # Full migration
 *   node scripts/wix-migration/migrate.js --dry-run        # Preview only
 *   node scripts/wix-migration/migrate.js --skip-images    # Skip image uploads
 *   node scripts/wix-migration/migrate.js --limit 10       # Migrate first 10 posts
 *
 * Prerequisites:
 *   - MySQL running with fat_big_quiz database
 *   - cd server && npx prisma generate (Prisma client generated)
 *   - .env configured in server/ directory
 *
 * IMPORTANT: Must be run from the fat-big-quiz root directory:
 *   node scripts/wix-migration/migrate.js
 */

const path = require("path");
const fs = require("fs");

// Resolve server directory (the correct Prisma client lives here, not the
// workspace-hoisted one which is SQLite from ai-blog-builder)
const SERVER_DIR = path.join(__dirname, "../../server");

// Load .env from server directory BEFORE requiring Prisma
require(path.join(SERVER_DIR, "node_modules/dotenv")).config({
  path: path.join(SERVER_DIR, ".env"),
});

// Use the server's Prisma client (MySQL) — NOT the workspace-hoisted one (SQLite)
const { PrismaClient } = require(path.join(SERVER_DIR, "node_modules/@prisma/client"));
const {
  S3Client,
  PutObjectCommand,
} = require(path.join(SERVER_DIR, "node_modules/@aws-sdk/client-s3"));

const prisma = new PrismaClient();

// ============================================================
// CONFIG
// ============================================================

const WIX_API_KEY =
  "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjg1ZmNjNmM1LWY0MjMtNGZiZC1iMDUxLWE2YmNmYWQxN2YwOFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImRkY2QyYWU3LTI3NWYtNGNkMi05ODhiLTA0NGVmZTZiODYyMFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI1MWRjYjQ2YS02Njg4LTQ0MTItODU5ZC0zZmRlZGNhYjU4ZjRcIn19IiwiaWF0IjoxNzcyMTQyMTAyfQ.k6d3-8IZtorDoZXbNbGbM37d8GKrih0xaRJHxPnoVCfbsYjujcPN2HLpbnS3T_6sl1SZvPr3zANhLKN7Dt6S9mTHhn5734xUqoQ219ersCiajEWLBIDDHaJa9oB-GX91ugtf1vV6u2Rj8HlvdXEdsXETO8vk-T6nX2DKrErls1o3AlGTN4Hk9VyBS9jnZKmw5C5NLM8I5lGQNI6joA2uEz-kFdnanFiQi7iDTaqkkNCeonCbXZQAfIOBRx0P2eumSLa8L7LsAVA6MlxBPlE7Lf42iniWDYVzAzdRB_SoAIy0nGMU2xpfkWYqUiYEEbNGJcKiuUuO0KJy-Kuwqtyt6g";
const WIX_SITE_ID = "dccd578c-7e56-4ae6-8056-8f526e672ff8";
const WIX_API_BASE = "https://www.wixapis.com/blog/v3";

// Wix quiz category IDs — used to identify which posts are quiz posts
const QUIZ_CATEGORY_IDS_LIST = {
  "bc7032ac-13fc-42dc-8012-bf7c7425ecc2": "Quiz of the Week",
  "973d4283-2fc7-4adf-934d-d52eb7b0f27a": "Quiz Questions and Answers",
  "c99d0ef4-a757-40e8-ab77-56dd7addc640": "Sports Quiz",
  "11bce909-55ba-4f60-b5cf-d3cd7fbe3047": "Weekly News Quiz",
  "ffb87e5e-5305-4a11-8f2a-ee197797ba2e": "Printable Picture Quiz",
  "3b14a2de-29f8-4f29-bff2-d67e77e73083": "Football Quiz",
  "08d8f069-c2f5-4b0d-b603-58451b76ae4d": "Dingbats Quiz",
  "b9eb4434-e475-4934-9fdf-69edae8744b2": "Picture Quizzes",
  "0501117f-7395-4853-aa2f-db84a247ec48": "Music Quizzes",
  "6600ca04-e841-4d34-8cad-bcb8b9ad8985": "Music Quiz Questions",
  "dac89b2a-a545-4cea-b2ce-4601f4fd15df": "General Knowledge Quiz",
  "2c78bc45-27ed-4b1a-8789-68cfc6e1775f": "Flag Quiz",
  "8aed714e-b828-4c10-b269-665cf925295e": "Quizzes",
};

const QUIZ_CATEGORY_IDS = new Set(Object.keys(QUIZ_CATEGORY_IDS_LIST));

// Consolidated FBQ categories: Wix category ID → clean FBQ category name
// Merges duplicates, keeps 8 real topic categories
const CATEGORY_MAP = {
  "c99d0ef4-a757-40e8-ab77-56dd7addc640": "Sports Quiz",
  "11bce909-55ba-4f60-b5cf-d3cd7fbe3047": "Weekly News Quiz",
  "3b14a2de-29f8-4f29-bff2-d67e77e73083": "Football Quiz",
  "08d8f069-c2f5-4b0d-b603-58451b76ae4d": "Dingbats Quiz",
  "dac89b2a-a545-4cea-b2ce-4601f4fd15df": "General Knowledge Quiz",
  "2c78bc45-27ed-4b1a-8789-68cfc6e1775f": "Flag Quiz",
  // Consolidated: Music Quizzes + Music Quiz Questions → Music Quiz
  "0501117f-7395-4853-aa2f-db84a247ec48": "Music Quiz",
  "6600ca04-e841-4d34-8cad-bcb8b9ad8985": "Music Quiz",
  // Consolidated: Picture Quizzes + Printable Picture Quiz → Picture Quiz
  "b9eb4434-e475-4934-9fdf-69edae8744b2": "Picture Quiz",
  "ffb87e5e-5305-4a11-8f2a-ee197797ba2e": "Picture Quiz",
  // These are tags only, NOT categories — no entry here:
  // "Quiz of the Week" → tag only, post goes to its topic category
  // "Quiz Questions and Answers" → tag only, post goes to its topic category
};

// Tag-only categories: these become tags but never the primary FBQ category
const TAG_ONLY_IDS = new Set([
  "bc7032ac-13fc-42dc-8012-bf7c7425ecc2", // Quiz of the Week
  "973d4283-2fc7-4adf-934d-d52eb7b0f27a", // Quiz Questions and Answers
  "8aed714e-b828-4c10-b269-665cf925295e", // Quizzes (generic)
]);

// DO Spaces config (loaded from .env)
const SPACES_CONFIG = {
  region: process.env.DO_SPACES_REGION,
  bucket: process.env.DO_SPACES_BUCKET,
  folder: process.env.DO_SPACES_FOLDER || "fat-big-quiz",
  endpoint: process.env.DO_SPACES_ENDPOINT,
  cdnEndpoint: process.env.DO_SPACES_CDN_ENDPOINT,
  key: process.env.DO_SPACES_KEY,
  secret: process.env.DO_SPACES_SECRET,
};

// Parse CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_IMAGES = args.includes("--skip-images");
const limitIdx = args.indexOf("--limit");
const POST_LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : 0;

// ============================================================
// WIX API CLIENT
// ============================================================

const wixHeaders = {
  Authorization: WIX_API_KEY,
  "wix-site-id": WIX_SITE_ID,
  "Content-Type": "application/json",
};

async function wixQuery(endpoint, body) {
  const res = await fetch(`${WIX_API_BASE}${endpoint}`, {
    method: "POST",
    headers: wixHeaders,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Wix API ${endpoint} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function fetchAllWixPosts() {
  console.log("[Wix] Fetching all blog posts...");
  const allPosts = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const data = await wixQuery("/posts/query", {
      paging: { limit, offset },
      fieldsets: ["URL", "CONTENT_TEXT", "RICH_CONTENT", "METRICS"],
    });

    allPosts.push(...data.posts);
    console.log(
      `[Wix] Fetched ${allPosts.length}/${data.pagingMetadata.total} posts`
    );

    if (!data.pagingMetadata.hasNext) break;
    offset += limit;

    // Rate limit: small delay between pages
    await sleep(200);
  }

  return allPosts;
}

// ============================================================
// RICH CONTENT → HTML CONVERTER (async — uploads inline images)
// ============================================================

// Cache: wixImageId → CDN URL (avoids re-uploading the same image across posts)
const imageCache = {};

async function richContentToHtml(richContent, postSlug) {
  if (!richContent || !richContent.nodes) return "";
  const parts = [];
  for (const node of richContent.nodes) {
    parts.push(await nodeToHtml(node, postSlug));
  }
  return parts.join("\n");
}

async function nodeToHtml(node, postSlug) {
  switch (node.type) {
    case "PARAGRAPH":
      return paragraphToHtml(node);
    case "HEADING":
      return headingToHtml(node);
    case "IMAGE":
      return await imageToHtml(node, postSlug);
    case "VIDEO":
      return videoToHtml(node);
    case "ORDERED_LIST":
      return await listToHtml(node, "ol", postSlug);
    case "BULLETED_LIST":
      return await listToHtml(node, "ul", postSlug);
    case "DIVIDER":
      return "<hr>";
    case "GALLERY":
      return await galleryToHtml(node, postSlug);
    case "COLLAPSIBLE_LIST":
      return await collapsibleListToHtml(node, postSlug);
    default:
      console.log(`[Convert] Unknown node type: ${node.type}`);
      return "";
  }
}

function textNodesToHtml(nodes) {
  return nodes
    .map((child) => {
      if (child.type === "TEXT") {
        let text = escapeHtml(child.textData.text);
        const decorations = child.textData.decorations || [];

        let linkUrl = null;
        for (const dec of decorations) {
          switch (dec.type) {
            case "BOLD":
              text = `<strong>${text}</strong>`;
              break;
            case "ITALIC":
              text = `<em>${text}</em>`;
              break;
            case "UNDERLINE":
              text = `<u>${text}</u>`;
              break;
            case "LINK":
              linkUrl = dec.linkData?.link?.url;
              break;
            case "FONT_SIZE":
            case "COLOR":
            case "FONT_FAMILY":
              break;
          }
        }

        if (linkUrl) {
          text = `<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener">${text}</a>`;
        }

        return text;
      }
      return "";
    })
    .join("");
}

function paragraphToHtml(node) {
  const inner = textNodesToHtml(node.nodes);
  if (!inner.trim()) return "";
  return `<p>${inner}</p>`;
}

function headingToHtml(node) {
  const level = node.headingData?.level || 2;
  const tag = `h${Math.min(Math.max(level, 1), 6)}`;
  const inner = textNodesToHtml(node.nodes);
  return `<${tag}>${inner}</${tag}>`;
}

/**
 * Resolve a Wix image id to a CDN URL.
 * Downloads from Wix, uploads to DO Spaces blog/content/, caches the result.
 */
async function resolveWixImage(imageId) {
  if (!imageId) return null;

  // Already uploaded this image
  if (imageCache[imageId]) return imageCache[imageId];

  const wixUrl = imageId.startsWith("http")
    ? imageId
    : `https://static.wixstatic.com/media/${imageId}`;

  if (SKIP_IMAGES) {
    // In skip-images mode, still use the Wix URL as a temporary fallback
    return wixUrl;
  }

  try {
    const { buffer, contentType } = await downloadImage(wixUrl);
    const fileName = imageId.replace(/[^a-zA-Z0-9._~-]/g, "_");
    const result = await uploadToCdn(buffer, fileName, "blog/content", contentType);
    imageCache[imageId] = result.cdnUrl;
    return result.cdnUrl;
  } catch (err) {
    console.error(`[Image] Failed to migrate inline image ${imageId}:`, err.message);
    // Fall back to Wix URL so the post isn't broken during migration
    return wixUrl;
  }
}

async function imageToHtml(node, postSlug) {
  const imageData = node.imageData;
  if (!imageData) return "";

  const imageId = imageData.image?.src?.id || imageData.image?.src?.url || "";
  if (!imageId) return "";

  const src = await resolveWixImage(imageId);
  if (!src) return "";

  const alt =
    imageData.altText ||
    node.nodes?.find((n) => n.type === "CAPTION")?.nodes?.[0]?.textData
      ?.text ||
    "";

  const linkUrl = imageData.link?.url;
  const imgTag = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
  const caption = imageData.caption || alt;
  const figCaption = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";

  if (linkUrl) {
    return `<figure><a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener">${imgTag}</a>${figCaption}</figure>`;
  }
  return `<figure>${imgTag}${figCaption}</figure>`;
}

function videoToHtml(node) {
  const videoData = node.videoData;
  if (!videoData) return "";

  const url = videoData.video?.src?.url || "";

  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (ytMatch) {
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen loading="lazy"></iframe></div>`;
  }

  return `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener">Watch video</a></p>`;
}

async function listToHtml(node, tag, postSlug) {
  const items = [];
  for (const li of node.nodes.filter((n) => n.type === "LIST_ITEM")) {
    const innerParts = [];
    for (const child of li.nodes) {
      innerParts.push(await nodeToHtml(child, postSlug));
    }
    const inner = innerParts.join("");
    const cleaned = inner.replace(/^<p>(.*)<\/p>$/s, "$1");
    items.push(`<li>${cleaned}</li>`);
  }
  return `<${tag}>\n${items.join("\n")}\n</${tag}>`;
}

async function galleryToHtml(node, postSlug) {
  const galleryData = node.galleryData;
  if (!galleryData || !galleryData.items) return "";

  const images = [];
  for (const item of galleryData.items) {
    const imageId = item.image?.media?.src?.id || item.image?.media?.src?.url || "";
    if (!imageId) continue;
    const src = await resolveWixImage(imageId);
    if (!src) continue;
    const alt = item.altText || "";
    images.push(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`);
  }

  return `<div class="gallery">\n${images.join("\n")}\n</div>`;
}

async function collapsibleListToHtml(node, postSlug) {
  const items = node.nodes || [];
  const parts = [];

  for (const item of items) {
    if (item.type !== "COLLAPSIBLE_ITEM") continue;

    let titleHtml = "";
    let bodyHtml = "";

    for (const child of item.nodes || []) {
      if (child.type === "COLLAPSIBLE_ITEM_TITLE") {
        // Title contains regular nodes (PARAGRAPH etc)
        const titleParts = [];
        for (const n of child.nodes || []) {
          titleParts.push(await nodeToHtml(n, postSlug));
        }
        // Strip wrapping <p> tags for cleaner summary
        titleHtml = titleParts
          .join("")
          .replace(/^<p>(.*)<\/p>$/s, "$1")
          .trim();
      } else if (child.type === "COLLAPSIBLE_ITEM_BODY") {
        const bodyParts = [];
        for (const n of child.nodes || []) {
          bodyParts.push(await nodeToHtml(n, postSlug));
        }
        bodyHtml = bodyParts.join("\n");
      }
    }

    if (titleHtml || bodyHtml) {
      parts.push(
        `<details>\n<summary><strong>${titleHtml}</strong></summary>\n${bodyHtml}\n</details>`
      );
    }
  }

  return parts.join("\n");
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================
// DO SPACES IMAGE UPLOAD
// ============================================================

let s3Client;

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: SPACES_CONFIG.endpoint,
      region: SPACES_CONFIG.region,
      credentials: {
        accessKeyId: SPACES_CONFIG.key,
        secretAccessKey: SPACES_CONFIG.secret,
      },
    });
  }
  return s3Client;
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${url} (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { buffer, contentType };
}

async function uploadToCdn(buffer, fileName, subFolder, contentType) {
  const timestamp = Date.now();
  const ext = path.extname(fileName) || ".jpg";
  const baseName = path
    .basename(fileName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, "_");
  const uniqueFileName = `${baseName}_${timestamp}${ext}`;
  const key = `${SPACES_CONFIG.folder}/${subFolder}/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: SPACES_CONFIG.bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: "public-read",
  });

  await getS3Client().send(command);

  return {
    fileName: uniqueFileName,
    cdnUrl: `${SPACES_CONFIG.cdnEndpoint}/${key}`,
  };
}

async function migrateCoverImage(post) {
  const imageUrl = post.media?.wixMedia?.image?.url;
  if (!imageUrl) return null;

  const originalName = post.media.wixMedia.image.filename || `cover-${post.slug}.jpg`;

  try {
    const { buffer, contentType } = await downloadImage(imageUrl);
    const result = await uploadToCdn(buffer, originalName, "blog", contentType);
    console.log(`[Image] Uploaded cover for "${post.slug}" → ${result.fileName}`);
    return result.fileName;
  } catch (err) {
    console.error(`[Image] Failed for "${post.slug}":`, err.message);
    return null;
  }
}

// ============================================================
// FBQ DATABASE OPERATIONS
// ============================================================

// Cache for category IDs
const fbqCategoryMap = {};

async function ensureAuthor() {
  // Find or create a "BucketRace" migration author
  const existing = await prisma.user.findUnique({
    where: { email: "laurence.stephan@bucketrace.com" },
  });

  if (existing) {
    console.log(`[DB] Using existing author: ${existing.email} (${existing.id})`);
    return existing.id;
  }

  const author = await prisma.user.create({
    data: {
      email: "laurence.stephan@bucketrace.com",
      firstName: "Laurence",
      lastName: "Stephan",
      role: "admin",
    },
  });

  console.log(`[DB] Created migration author: ${author.email} (${author.id})`);
  return author.id;
}

async function ensureCategory(name) {
  if (fbqCategoryMap[name]) return fbqCategoryMap[name];

  // Check if category already exists
  const existing = await prisma.category.findFirst({
    where: { name, type: "BLOG" },
  });

  if (existing) {
    fbqCategoryMap[name] = existing.id;
    return existing.id;
  }

  const cat = await prisma.category.create({
    data: {
      name,
      type: "BLOG",
    },
  });

  console.log(`[DB] Created blog category: "${name}" (${cat.id})`);
  fbqCategoryMap[name] = cat.id;
  return cat.id;
}

async function postExists(slug) {
  const existing = await prisma.blogPost.findUnique({
    where: { slug },
    select: { id: true },
  });
  return !!existing;
}

async function createBlogPost(data) {
  const post = await prisma.blogPost.create({
    data: {
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      coverImage: data.coverImage,
      published: true,
      createdAt: data.createdAt,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      authorId: data.authorId,
      categoryId: data.categoryId,
      viewCount: data.viewCount || 0,
    },
  });

  // Connect tags
  if (data.tags && data.tags.length > 0) {
    for (const tagName of data.tags) {
      await prisma.tag.upsert({
        where: { name: tagName },
        update: {
          posts: { connect: { id: post.id } },
        },
        create: {
          name: tagName,
          posts: { connect: { id: post.id } },
        },
      });
    }
  }

  return post;
}

// ============================================================
// MIGRATION LOGIC
// ============================================================

function isQuizPost(post) {
  return post.categoryIds.some((id) => QUIZ_CATEGORY_IDS.has(id));
}

function getPrimaryQuizCategory(post) {
  // Prefer a real topic category (skip tag-only ones like "Quiz of the Week")
  for (const id of post.categoryIds) {
    if (CATEGORY_MAP[id]) return CATEGORY_MAP[id];
  }
  // Fallback: if the post only has tag-only categories, use General Knowledge Quiz
  return "General Knowledge Quiz";
}

function getTagsFromPost(post) {
  const tags = [];
  for (const id of post.categoryIds) {
    if (TAG_ONLY_IDS.has(id)) {
      // Keep the original Wix name as a tag for keyword coverage
      tags.push(QUIZ_CATEGORY_IDS_LIST[id]);
    } else if (CATEGORY_MAP[id]) {
      tags.push(CATEGORY_MAP[id]);
    }
  }
  // Add Wix hashtags if present
  if (post.hashtags) {
    tags.push(...post.hashtags);
  }
  return [...new Set(tags)];
}

function generateExcerpt(contentText, maxLength = 300) {
  if (!contentText) return null;
  const trimmed = contentText.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

async function migrate() {
  console.log("=".repeat(60));
  console.log("Wix BucketRace → Fat Big Quiz Blog Migration");
  console.log("=".repeat(60));
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Images: ${SKIP_IMAGES ? "SKIPPED" : "UPLOAD TO CDN"}`);
  if (POST_LIMIT) console.log(`Limit: ${POST_LIMIT} posts`);
  console.log("");

  // Step 1: Fetch all posts from Wix
  const allPosts = await fetchAllWixPosts();
  console.log(`[Wix] Total posts fetched: ${allPosts.length}`);

  // Step 2: Filter for quiz posts
  const quizPosts = allPosts.filter(isQuizPost);
  console.log(`[Filter] Quiz posts: ${quizPosts.length} / ${allPosts.length}`);

  // Apply limit if set
  const postsToMigrate = POST_LIMIT
    ? quizPosts.slice(0, POST_LIMIT)
    : quizPosts;
  console.log(`[Migrate] Posts to process: ${postsToMigrate.length}`);

  // Category breakdown
  const catCounts = {};
  for (const p of quizPosts) {
    const cat = getPrimaryQuizCategory(p);
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  console.log("\n[Categories] Breakdown:");
  for (const [cat, count] of Object.entries(catCounts).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${cat}: ${count} posts`);
  }
  console.log("");

  if (DRY_RUN) {
    // In dry-run mode, just show what would happen
    console.log("[Dry Run] Would create the following categories in FBQ:");
    const uniqueCats = [...new Set(quizPosts.map(getPrimaryQuizCategory))];
    uniqueCats.forEach((c) => console.log(`  - ${c}`));

    console.log("\n[Dry Run] Sample posts to migrate:");
    postsToMigrate.slice(0, 5).forEach((p) => {
      console.log(`  "${p.title}" (${p.slug})`);
      console.log(`    Category: ${getPrimaryQuizCategory(p)}`);
      console.log(`    Published: ${p.firstPublishedDate}`);
      console.log(`    Cover: ${p.media?.wixMedia?.image?.url ? "yes" : "no"}`);
    });

    // Still generate redirect map in dry-run mode
    writeRedirectMap(quizPosts);
    writeMigrationReport(quizPosts, allPosts);
    console.log("\n[Dry Run] Complete. No data was written to the database.");
    return;
  }

  // Step 3: Ensure author exists
  const authorId = await ensureAuthor();

  // Step 4: Create categories and migrate posts
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < postsToMigrate.length; i++) {
    const post = postsToMigrate[i];
    const progress = `[${i + 1}/${postsToMigrate.length}]`;

    // Check if already migrated
    if (await postExists(post.slug)) {
      console.log(`${progress} SKIP "${post.slug}" (already exists)`);
      skipped++;
      continue;
    }

    try {
      // Determine category
      const catName = getPrimaryQuizCategory(post);
      const categoryId = await ensureCategory(catName);

      // Upload cover image
      let coverImage = null;
      if (!SKIP_IMAGES && post.media?.wixMedia?.image?.url) {
        coverImage = await migrateCoverImage(post);
        await sleep(100); // Rate limit image downloads
      }

      // Convert rich content to HTML (downloads + re-uploads inline images to CDN)
      const htmlContent = await richContentToHtml(post.richContent, post.slug);

      // Generate excerpt from contentText
      const excerpt = post.excerpt || generateExcerpt(post.contentText);

      // Get tags
      const tags = getTagsFromPost(post);

      // Create the blog post
      const created_post = await createBlogPost({
        title: post.title,
        slug: post.slug,
        content: htmlContent,
        excerpt,
        coverImage,
        createdAt: new Date(post.firstPublishedDate),
        metaTitle: post.title,
        metaDescription: excerpt ? excerpt.substring(0, 160) : null,
        authorId,
        categoryId,
        tags,
        viewCount: post.metrics?.views || 0,
      });

      console.log(
        `${progress} OK "${post.slug}" → ${catName} (${created_post.id})`
      );
      created++;
    } catch (err) {
      console.error(`${progress} FAIL "${post.slug}":`, err.message);
      failed++;
    }

    // Small delay between DB writes
    if (i % 10 === 9) await sleep(100);
  }

  // Step 5: Generate redirect map and report
  writeRedirectMap(quizPosts);
  writeMigrationReport(quizPosts, allPosts);

  console.log("\n" + "=".repeat(60));
  console.log("Migration Complete");
  console.log("=".repeat(60));
  console.log(`Created:  ${created}`);
  console.log(`Skipped:  ${skipped} (already existed)`);
  console.log(`Failed:   ${failed}`);
  console.log(`Total:    ${postsToMigrate.length}`);
}

// ============================================================
// OUTPUT FILES
// ============================================================

function writeRedirectMap(quizPosts) {
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // nginx redirect map format
  const lines = [
    "# Wix BucketRace → Fat Big Quiz redirect map",
    "# Generated: " + new Date().toISOString(),
    "# Usage: include this file in nginx config",
    "#   map $request_uri $redirect_uri { include /path/to/redirect-map.conf; }",
    "#   if ($redirect_uri) { return 301 $redirect_uri; }",
    "",
  ];

  for (const post of quizPosts) {
    const oldPath = `/post/${post.slug}`;
    const newUrl = `https://fatbigquiz.com/blog/${post.slug}`;
    lines.push(`${oldPath} ${newUrl};`);
  }

  const filePath = path.join(outputDir, "redirect-map.conf");
  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  console.log(`[Output] Redirect map: ${filePath} (${quizPosts.length} rules)`);
}

function writeMigrationReport(quizPosts, allPosts) {
  const outputDir = path.join(__dirname, "output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const nonQuizPosts = allPosts.filter((p) => !isQuizPost(p));

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalWixPosts: allPosts.length,
      quizPostsMigrated: quizPosts.length,
      nonQuizPostsRemaining: nonQuizPosts.length,
    },
    quizCategories: Object.entries(CATEGORY_MAP).map(([id, name]) => ({
      wixId: id,
      name,
      postCount: quizPosts.filter((p) => p.categoryIds.includes(id)).length,
    })),
    nonQuizPosts: nonQuizPosts.map((p) => ({
      title: p.title,
      slug: p.slug,
      wixUrl: `${p.url?.base}${p.url?.path}`,
      categoryIds: p.categoryIds,
    })),
    urlMapping: quizPosts.map((p) => ({
      title: p.title,
      oldUrl: `https://www.bucketrace.com/post/${p.slug}`,
      newUrl: `https://fatbigquiz.com/blog/${p.slug}`,
    })),
  };

  const filePath = path.join(outputDir, "migration-report.json");
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2) + "\n");
  console.log(`[Output] Migration report: ${filePath}`);
}

// ============================================================
// UTILS
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// MAIN
// ============================================================

migrate()
  .catch((err) => {
    console.error("[Fatal]", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
