/**
 * Patch script: Re-converts the 19 posts that had COLLAPSIBLE_LIST nodes.
 * Fetches fresh rich content from Wix, converts with the new handler, and
 * updates the existing DB rows.
 *
 * Usage: node scripts/wix-migration/patch-collapsible.js
 */

const path = require("path");

const SERVER_DIR = path.join(__dirname, "../../server");
require(path.join(SERVER_DIR, "node_modules/dotenv")).config({
  path: path.join(SERVER_DIR, ".env"),
});
const { PrismaClient } = require(path.join(SERVER_DIR, "node_modules/@prisma/client"));
const prisma = new PrismaClient();

// Import the converter + helpers from migrate.js via inline require won't work
// cleanly, so we'll duplicate the necessary functions. However, since migrate.js
// is the source of truth, let's use a different approach: require the whole
// migrate module's functions by loading it.

// Actually, let's just inline the API call + use the updated migrate.js converter
// by requiring it. But migrate.js isn't a module. So let's copy the essentials.

const WIX_API_KEY =
  "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjg1ZmNjNmM1LWY0MjMtNGZiZC1iMDUxLWE2YmNmYWQxN2YwOFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImRkY2QyYWU3LTI3NWYtNGNkMi05ODhiLTA0NGVmZTZiODYyMFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI1MWRjYjQ2YS02Njg4LTQ0MTItODU5ZC0zZmRlZGNhYjU4ZjRcIn19IiwiaWF0IjoxNzcyMTQyMTAyfQ.k6d3-8IZtorDoZXbNbGbM37d8GKrih0xaRJHxPnoVCfbsYjujcPN2HLpbnS3T_6sl1SZvPr3zANhLKN7Dt6S9mTHhn5734xUqoQ219ersCiajEWLBIDDHaJa9oB-GX91ugtf1vV6u2Rj8HlvdXEdsXETO8vk-T6nX2DKrErls1o3AlGTN4Hk9VyBS9jnZKmw5C5NLM8I5lGQNI6joA2uEz-kFdnanFiQi7iDTaqkkNCeonCbXZQAfIOBRx0P2eumSLa8L7LsAVA6MlxBPlE7Lf42iniWDYVzAzdRB_SoAIy0nGMU2xpfkWYqUiYEEbNGJcKiuUuO0KJy-Kuwqtyt6g";
const WIX_SITE_ID = "dccd578c-7e56-4ae6-8056-8f526e672ff8";

const {
  S3Client,
  PutObjectCommand,
} = require(path.join(SERVER_DIR, "node_modules/@aws-sdk/client-s3"));

const SPACES_CONFIG = {
  endpoint: `https://${process.env.DO_SPACES_REGION || "sfo3"}.digitaloceanspaces.com`,
  region: process.env.DO_SPACES_REGION || "sfo3",
  bucket: process.env.DO_SPACES_BUCKET || "aitshirts-laurence-dot-computer",
  key: process.env.DO_SPACES_KEY,
  secret: process.env.DO_SPACES_SECRET,
  cdnEndpoint:
    process.env.DO_SPACES_CDN_ENDPOINT ||
    "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com",
  prefix: "fat-big-quiz",
};

// Slugs of posts that had COLLAPSIBLE_LIST content
const AFFECTED_SLUGS = [
  "free-news-quiz-of-the-week-2023-01-10-23",
  "free-news-quiz-of-the-week-2023-18-09-23",
  "free-news-quiz-of-the-week-18-09-23",
  "free-news-quiz-of-the-week-11-09-23",
  "free-news-quiz-of-the-week-04-09-23",
  "free-news-quiz-of-the-week-28-08-23",
  "free-news-quiz-of-the-week-21-08-23",
  "retitled-book-quiz-with-answers",
  "which-bitch-is-which-halloween-dog-quiz",
  "free-news-quiz-of-the-week-14-08-23",
  "under-my-umbrella-logo-quiz-with-answers",
  "we-re-making-a-killing-horror-picture-quiz-most-on-screen-kills",
  "free-news-quiz-of-the-week-07-08-23",
  "feeling-hot-hot-hot-printable-picture-quiz",
  "free-news-quiz-of-the-week-31-07-23",
  "you-re-getting-warmer-printable-picture-quiz",
  "free-news-quiz-of-the-week",
  "football-quiz-premier-league-oldest-premier-league-players-2022-23-season",
  "football-quiz-questions-and-answers-oldest-premier-league-goal-keepers",
];

// ============================================================
// IMAGE HELPERS (copied from migrate.js)
// ============================================================

const imageCache = {};
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
  const res = await globalThis.fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return { buffer, contentType };
}

async function uploadToCdn(buffer, fileName, folder, contentType) {
  const key = `${SPACES_CONFIG.prefix}/${folder}/${fileName}`;
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: SPACES_CONFIG.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
  return { cdnUrl: `${SPACES_CONFIG.cdnEndpoint}/${key}` };
}

async function resolveWixImage(imageId) {
  if (!imageId) return null;
  if (imageCache[imageId]) return imageCache[imageId];
  const wixUrl = imageId.startsWith("http")
    ? imageId
    : `https://static.wixstatic.com/media/${imageId}`;
  try {
    const { buffer, contentType } = await downloadImage(wixUrl);
    const fileName = imageId.replace(/[^a-zA-Z0-9._~-]/g, "_");
    const result = await uploadToCdn(buffer, fileName, "blog/content", contentType);
    imageCache[imageId] = result.cdnUrl;
    return result.cdnUrl;
  } catch (err) {
    console.error(`[Image] Failed to migrate inline image ${imageId}:`, err.message);
    return wixUrl;
  }
}

// ============================================================
// HTML CONVERTER (same as migrate.js with COLLAPSIBLE_LIST support)
// ============================================================

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
            case "BOLD": text = `<strong>${text}</strong>`; break;
            case "ITALIC": text = `<em>${text}</em>`; break;
            case "UNDERLINE": text = `<u>${text}</u>`; break;
            case "LINK": linkUrl = dec.linkData?.link?.url; break;
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

async function imageToHtml(node, postSlug) {
  const imageData = node.imageData;
  if (!imageData) return "";
  const imageId = imageData.image?.src?.id || imageData.image?.src?.url || "";
  if (!imageId) return "";
  const src = await resolveWixImage(imageId);
  if (!src) return "";
  const alt = imageData.altText || "";
  const caption = imageData.caption || "";
  let html = `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
  if (caption) html += `\n<p class="image-caption"><em>${escapeHtml(caption)}</em></p>`;
  return html;
}

function videoToHtml(node) {
  const videoData = node.videoData;
  if (!videoData) return "";
  const src = videoData.video?.src?.url || videoData.url || "";
  if (!src) return "";
  if (src.includes("youtube") || src.includes("youtu.be")) {
    const id = src.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    if (id)
      return `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
  }
  return `<video src="${escapeHtml(src)}" controls style="max-width:100%"></video>`;
}

async function listToHtml(node, tag, postSlug) {
  const items = [];
  for (const child of node.nodes || []) {
    if (child.type === "LIST_ITEM") {
      const inner = [];
      for (const n of child.nodes || []) {
        inner.push(await nodeToHtml(n, postSlug));
      }
      items.push(`<li>${inner.join("")}</li>`);
    }
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
        const titleParts = [];
        for (const n of child.nodes || []) {
          titleParts.push(await nodeToHtml(n, postSlug));
        }
        titleHtml = titleParts.join("").replace(/^<p>(.*)<\/p>$/s, "$1").trim();
      } else if (child.type === "COLLAPSIBLE_ITEM_BODY") {
        const bodyParts = [];
        for (const n of child.nodes || []) {
          bodyParts.push(await nodeToHtml(n, postSlug));
        }
        bodyHtml = bodyParts.join("\n");
      }
    }
    if (titleHtml || bodyHtml) {
      parts.push(`<details>\n<summary><strong>${titleHtml}</strong></summary>\n${bodyHtml}\n</details>`);
    }
  }
  return parts.join("\n");
}

async function nodeToHtml(node, postSlug) {
  switch (node.type) {
    case "PARAGRAPH": return paragraphToHtml(node);
    case "HEADING": return headingToHtml(node);
    case "IMAGE": return await imageToHtml(node, postSlug);
    case "VIDEO": return videoToHtml(node);
    case "ORDERED_LIST": return await listToHtml(node, "ol", postSlug);
    case "BULLETED_LIST": return await listToHtml(node, "ul", postSlug);
    case "DIVIDER": return "<hr>";
    case "GALLERY": return await galleryToHtml(node, postSlug);
    case "COLLAPSIBLE_LIST": return await collapsibleListToHtml(node, postSlug);
    default:
      console.log(`[Convert] Unknown node type: ${node.type}`);
      return "";
  }
}

async function richContentToHtml(richContent, postSlug) {
  if (!richContent || !richContent.nodes) return "";
  const parts = [];
  for (const node of richContent.nodes) {
    parts.push(await nodeToHtml(node, postSlug));
  }
  return parts.join("\n");
}

// ============================================================
// WIX API
// ============================================================

async function fetchPostBySlug(slug) {
  const res = await globalThis.fetch("https://www.wixapis.com/blog/v3/posts/query", {
    method: "POST",
    headers: {
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        filter: { slug },
        paging: { limit: 1 },
      },
      fieldsets: ["RICH_CONTENT"],
    }),
  });
  if (!res.ok) throw new Error(`Wix API failed: ${res.status}`);
  const data = await res.json();
  return data.posts?.[0] || null;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("============================================================");
  console.log("Patch: Re-converting COLLAPSIBLE_LIST posts");
  console.log("============================================================");
  console.log(`Posts to patch: ${AFFECTED_SLUGS.length}\n`);

  let updated = 0;
  let failed = 0;

  for (const slug of AFFECTED_SLUGS) {
    try {
      // 1. Fetch fresh rich content from Wix
      const wixPost = await fetchPostBySlug(slug);
      if (!wixPost) {
        console.log(`[SKIP] "${slug}" — not found on Wix`);
        failed++;
        continue;
      }

      // 2. Convert with COLLAPSIBLE_LIST support
      const newHtml = await richContentToHtml(wixPost.richContent, slug);

      // 3. Update in DB
      const dbPost = await prisma.blogPost.findFirst({ where: { slug } });
      if (!dbPost) {
        console.log(`[SKIP] "${slug}" — not found in FBQ database`);
        failed++;
        continue;
      }

      await prisma.blogPost.update({
        where: { id: dbPost.id },
        data: { content: newHtml },
      });

      updated++;
      console.log(`[${updated}/${AFFECTED_SLUGS.length}] OK "${slug}"`);

      // Rate limit
      await new Promise((r) => setTimeout(r, 300));
    } catch (err) {
      console.error(`[FAIL] "${slug}":`, err.message);
      failed++;
    }
  }

  console.log("\n============================================================");
  console.log(`Patch complete: ${updated} updated, ${failed} failed`);
  console.log("============================================================");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
