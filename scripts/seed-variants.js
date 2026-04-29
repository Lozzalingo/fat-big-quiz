/**
 * Seed FBQ product variants from Wix MotiveMeansOpportunity collection
 * Creates variants under the 3 parent products: Fat Big Quiz, Game Shows, Whacky Wagers
 * Downloads cover images + gallery images to DO Spaces
 * Sets YouTube video URLs from Wix promoVideo field
 *
 * Usage:
 *   node scripts/seed-variants.js           # full run
 *   node scripts/seed-variants.js --dry-run  # preview only
 */

const path = require('path');
const SERVER_DIR = path.join(__dirname, '../server');
require(path.join(SERVER_DIR, 'node_modules/dotenv')).config({ path: path.join(SERVER_DIR, '.env') });

const { PrismaClient } = require(path.join(SERVER_DIR, 'node_modules/@prisma/client'));
const { S3Client, PutObjectCommand, HeadObjectCommand } = require(path.join(SERVER_DIR, 'node_modules/@aws-sdk/client-s3'));

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

const WIX_API_KEY = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjg1ZmNjNmM1LWY0MjMtNGZiZC1iMDUxLWE2YmNmYWQxN2YwOFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImRkY2QyYWU3LTI3NWYtNGNkMi05ODhiLTA0NGVmZTZiODYyMFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI1MWRjYjQ2YS02Njg4LTQ0MTItODU5ZC0zZmRlZGNhYjU4ZjRcIn19IiwiaWF0IjoxNzcyMTQyMTAyfQ.k6d3-8IZtorDoZXbNbGbM37d8GKrih0xaRJHxPnoVCfbsYjujcPN2HLpbnS3T_6sl1SZvPr3zANhLKN7Dt6S9mTHhn5734xUqoQ219ersCiajEWLBIDDHaJa9oB-GX91ugtf1vV6u2Rj8HlvdXEdsXETO8vk-T6nX2DKrErls1o3AlGTN4Hk9VyBS9jnZKmw5C5NLM8I5lGQNI6joA2uEz-kFdnanFiQi7iDTaqkkNCeonCbXZQAfIOBRx0P2eumSLa8L7LsAVA6MlxBPlE7Lf42iniWDYVzAzdRB_SoAIy0nGMU2xpfkWYqUiYEEbNGJcKiuUuO0KJy-Kuwqtyt6g';
const SITE_ID = 'dccd578c-7e56-4ae6-8056-8f526e672ff8';

const SPACES_BUCKET = process.env.DO_SPACES_BUCKET;
const SPACES_FOLDER = process.env.DO_SPACES_FOLDER || 'fat-big-quiz';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT;

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION || 'sfo3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
});

// Map Wix product titles to our parent slugs + variant config
const VARIANT_CONFIG = {
  // ─── Fat Big Quiz variants ─────────────────────────────────────
  'The Fat Big Virtual Quiz of... Love': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-love',
    variantLabel: "Valentine's Edition",
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=Uas9jvdUK6E',
  },
  'The Fat Big Virtual Quiz of... Christmas': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-christmas',
    variantLabel: 'Christmas Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=4YLqCgTMpnM',
  },
  'The Fat Big Virtual Quiz of... Halloween': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-halloween',
    variantLabel: 'Halloween Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=7F4UvIX5RCs',
  },
  'The Fat Big Virtual Quiz of... Easter': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-easter',
    variantLabel: 'Easter Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=kN2nzqxU09Q',
  },
  'The Fat Big Virtual Quiz of... Britain': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-britain',
    variantLabel: 'Britain Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=5asX3YH3RN0',
  },
  'The Fat Big Virtual Quiz of... Europe': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-europe',
    variantLabel: 'Europe Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=ol6DlLDx5IY',
  },
  'The Fat Big Virtual Quiz of... Summer': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-summer',
    variantLabel: 'Summer Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=HUFDj68M8uA',
  },
  'The Fat Big Virtual Quiz of... Spring': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-spring',
    variantLabel: 'Spring Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=UsOyhoRwPGc',
  },
  'The Fat Big Virtual Quiz of... Fireworks & Fall': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-fireworks-fall',
    variantLabel: 'Fireworks & Fall Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=mjWaptlY2uQ',
  },
  'The Fat Big Virtual Quiz of... The Year 2021': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-year-2021',
    variantLabel: 'Year 2021 Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=HdIsfxbhxro',
  },
  'The Fat Big Virtual Quiz of... The Year 2022': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-year-2022',
    variantLabel: 'Year 2022 Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of… The World': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-the-world',
    variantLabel: 'World Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of… USA': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-usa',
    variantLabel: 'USA Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of… Down Under': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-down-under',
    variantLabel: 'Down Under Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of... Everything 1': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-everything-1',
    variantLabel: 'Everything Vol. 1',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of... Everything 2': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-everything-2',
    variantLabel: 'Everything Vol. 2',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of... Earth Day': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-earth-day',
    variantLabel: 'Earth Day Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of... Mental Well-being': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-mental-wellbeing',
    variantLabel: 'Mental Well-being Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of... Pride': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-pride',
    variantLabel: 'Pride Edition',
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Virtual Quiz of... St Patrick': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-st-patrick',
    variantLabel: "St Patrick's Edition",
    eventFormat: 'VIRTUAL',
  },
  "The Fat Big Virtual Quiz of... International Women's Day": {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-international-womens-day',
    variantLabel: "International Women's Day Edition",
    eventFormat: 'VIRTUAL',
  },
  'The Fat Big Quiz on Stage': {
    parentSlug: 'fat-big-quiz',
    slug: 'fat-big-quiz-on-stage',
    variantLabel: 'On Stage',
    eventFormat: 'IN_PERSON',
    videoUrl: 'https://youtu.be/MyE37NjmUXE',
  },

  // ─── Game Shows variants ─────────────────────────────────────
  'An On Stage Journey Through the History of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-on-stage',
    variantLabel: 'On Stage',
    eventFormat: 'IN_PERSON',
    videoUrl: 'https://www.youtube.com/watch?v=8UK0NEmtI5o',
  },
  'A Global Journey Through the History of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-global',
    variantLabel: 'Global Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=8UK0NEmtI5o',
  },
  'A U.K. vs U.S.A. Journey Through the History of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-uk-vs-usa',
    variantLabel: 'UK vs USA',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=8UK0NEmtI5o',
  },
  'An American Journey Through the History of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-american',
    variantLabel: 'American Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=8UK0NEmtI5o',
  },
  'A British Journey Through The History Of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-british',
    variantLabel: 'British Edition',
    eventFormat: 'VIRTUAL',
    videoUrl: 'https://www.youtube.com/watch?v=8UK0NEmtI5o',
  },
  'A Journey of Love Through the History of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-love',
    variantLabel: "Valentine's Edition",
    eventFormat: 'VIRTUAL',
  },
  'A Christmas Journey Through the History of Game Shows': {
    parentSlug: 'game-shows',
    slug: 'game-shows-christmas',
    variantLabel: 'Christmas Edition',
    eventFormat: 'VIRTUAL',
  },
  'Karaoke On Stage': {
    parentSlug: 'game-shows',
    slug: 'karaoke-on-stage',
    variantLabel: 'Karaoke',
    eventFormat: 'IN_PERSON',
  },
  'Bingo On Stage': {
    parentSlug: 'game-shows',
    slug: 'bingo-on-stage',
    variantLabel: 'Bingo',
    eventFormat: 'IN_PERSON',
  },

  // ─── Whacky Wagers variants ──────────────────────────────────
  'Whacky Wager Betting': {
    parentSlug: 'whacky-wagers',
    slug: 'whacky-wager-betting',
    variantLabel: 'Betting',
    eventFormat: 'HYBRID',
    videoUrl: 'https://www.youtube.com/watch?v=wzivrFoSAgY',
  },
  'Office Olympics': {
    parentSlug: 'whacky-wagers',
    slug: 'office-olympics',
    variantLabel: 'Office Olympics',
    eventFormat: 'IN_PERSON',
  },
  'Office Talent Show': {
    parentSlug: 'whacky-wagers',
    slug: 'office-talent-show',
    variantLabel: 'Talent Show',
    eventFormat: 'IN_PERSON',
  },
  'Adult Sports Day': {
    parentSlug: 'whacky-wagers',
    slug: 'adult-sports-day',
    variantLabel: 'Adult Sports Day',
    eventFormat: 'IN_PERSON',
  },
  'Table Top Games': {
    parentSlug: 'whacky-wagers',
    slug: 'table-top-games',
    variantLabel: 'Table Top Games',
    eventFormat: 'IN_PERSON',
  },
};

// Items to skip (not FBQ products or special pages)
const SKIP_TITLES = [
  'Game Show List',
  'Classic Problem Solving',
  'Seasonal Parties',
  'Bespoke Parties',
  'Mash-Up Party',
  'Christmas Day Mashup',
  'Gamification Consultancy',
  // Scavenger hunts (BucketRace, not FBQ)
  'Classic Scavenger Hunt',
  'Theatrical, Scavenger Hunt, with a Character Host',
  '12 Days of Christmas Scavenger Hunt',
  'Halloween Scavenger Hunt',
  'Summer Scavenger Hunt',
  'Easter Scavenger Hunt',
  "Valentine's Day Couples Scavenger Hunt",
  'Indoor Scavenger Hunts',
  'Indoor Christmas Scavenger Hunt',
  "Children's Easter Scavenger Hunt",
  "Children's Scavenger Hunts",
  'Social Distancing Scavenger Hunt',
  'Guy Fawkes Bonfire Scavenger Hunt',
  'Winter Scavenger Hunt',
  'Summer Season Scavenger Hunt',
  // Murder mysteries (separate category)
  'Clause For Concern Murder Mystery',
  'Billionaire Shortbread Murder Mystery',
  'Butch Cassidy and the Sun Dance Kid Murder Mystery',
  'Who Let The Cat Out The Bag? Murder Mystery',
  'Who Assassinated The President? Murder Mystery',
  // Special events
  'Virtual Easter Hunt Game And Sing Along With Special Guests!',
  'Virtual Santa\'s Grotto Game And Sing Along With Special Guests!',
];

function getWixImageUrl(wixImage) {
  if (!wixImage) return null;
  if (typeof wixImage === 'string' && wixImage.startsWith('http')) return wixImage;
  const str = typeof wixImage === 'string' ? wixImage : (wixImage.src || '');
  const match = str.match(/wix:image:\/\/v1\/([^/]+)\//);
  if (match) return `https://static.wixstatic.com/media/${match[1]}`;
  return null;
}

async function objectExists(key) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: SPACES_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function uploadImage(imageUrl, filename) {
  if (DRY_RUN || !imageUrl) return filename;

  const key = `${SPACES_FOLDER}/products/images/${filename}`;
  if (await objectExists(key)) {
    console.log(`    [Image] Already exists: ${filename}`);
    return filename;
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.log(`    [Warn] Download failed: ${response.status} - ${imageUrl}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await s3Client.send(new PutObjectCommand({
      Bucket: SPACES_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: response.headers.get('content-type') || 'image/jpeg',
      ACL: 'public-read',
    }));
    console.log(`    [Image] Uploaded: ${filename} (${(buffer.length / 1024).toFixed(0)}KB)`);
    return filename;
  } catch (err) {
    console.error(`    [Image] Upload failed: ${err.message}`);
    return null;
  }
}

async function fetchWixData(collectionId) {
  const allItems = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const res = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
      method: 'POST',
      headers: {
        'Authorization': WIX_API_KEY,
        'wix-site-id': SITE_ID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dataCollectionId: collectionId,
        query: { filter: {}, paging: { limit, offset } },
        returnTotalCount: true,
      }),
    });
    const data = await res.json();
    const items = data.dataItems || [];
    allItems.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }

  return allItems;
}

async function main() {
  console.log(`\n=== FBQ Variant Seeder ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  // 1. Get parent products
  console.log('[DB] Loading parent products...');
  const parents = await prisma.product.findMany({ where: { isParent: true } });
  const parentMap = {};
  for (const p of parents) {
    parentMap[p.slug] = p;
    console.log(`  Parent: ${p.title} (${p.slug}) — ${p.id}`);
  }

  if (parents.length === 0) {
    console.error('[Error] No parent products found! Run restructure-products.js first.');
    process.exit(1);
  }

  // 2. Fetch Wix data
  console.log('\n[Wix] Fetching products...');
  const wixItems = await fetchWixData('MotiveMeansOpportunity');
  console.log(`[Wix] Found ${wixItems.length} items\n`);

  // 3. Process each item
  let created = 0;
  let skipped = 0;
  let skippedNotConfig = 0;

  for (const item of wixItems) {
    const d = item.data || {};
    const title = d.title;

    if (SKIP_TITLES.includes(title)) continue;

    const config = VARIANT_CONFIG[title];
    if (!config) {
      console.log(`  [Skip] No config for: "${title}"`);
      skippedNotConfig++;
      continue;
    }

    const parent = parentMap[config.parentSlug];
    if (!parent) {
      console.log(`  [Skip] Parent "${config.parentSlug}" not found for: "${title}"`);
      continue;
    }

    // Check if already exists
    const existing = await prisma.product.findUnique({ where: { slug: config.slug } });
    if (existing) {
      console.log(`  [Exists] ${title} → ${config.slug}`);
      // Update video URL if missing
      if (config.videoUrl && !existing.videoUrl && !DRY_RUN) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { videoUrl: config.videoUrl },
        });
        console.log(`    Updated videoUrl: ${config.videoUrl}`);
      }
      skipped++;
      continue;
    }

    console.log(`\n  Creating: ${title}`);
    console.log(`    Slug: ${config.slug}`);
    console.log(`    Parent: ${config.parentSlug}`);
    console.log(`    Format: ${config.eventFormat}`);
    if (config.videoUrl) console.log(`    Video: ${config.videoUrl}`);

    // Upload cover image
    const imageUrl = getWixImageUrl(d.image);
    const coverFilename = imageUrl ? `${config.slug}-cover.jpg` : 'placeholder.jpg';
    if (imageUrl) {
      await uploadImage(imageUrl, coverFilename);
    }

    // Clean description
    let description = d.murderMysteryDescriptions || `<p>${title}</p>`;
    description = description
      .replace(/class="[^"]*"/g, '')
      .replace(/style="[^"]*"/g, '')
      .replace(/<p\s*>/g, '<p>')
      .replace(/<h[2-6]\s*>/g, (match) => match.replace(/\s+/g, ''));

    // Extract YouTube URLs from description and replace with clean embeds
    const ytRegex = /<iframe[^>]*src="(https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+)[^"]*"[^>]*><\/iframe>/gi;
    description = description.replace(ytRegex, ''); // Remove iframe embeds from description (we show video separately)

    if (!DRY_RUN) {
      const product = await prisma.product.create({
        data: {
          slug: config.slug,
          title,
          mainImage: coverFilename,
          price: 0,
          description,
          manufacturer: 'Fat Big Quiz',
          productType: 'EVENT',
          parentId: parent.id,
          isParent: false,
          variantLabel: config.variantLabel,
          eventFormat: config.eventFormat,
          videoUrl: config.videoUrl || null,
          inStock: 1,
          displayOrder: created,
        },
      });

      // Upload gallery images
      const gallery = d.gallery || [];
      if (gallery.length > 0) {
        console.log(`    Gallery: ${gallery.length} images`);
        for (let i = 0; i < gallery.length; i++) {
          const galleryUrl = getWixImageUrl(gallery[i].src || gallery[i]);
          if (galleryUrl) {
            const galleryFilename = `${config.slug}-gallery-${i + 1}.jpg`;
            const uploaded = await uploadImage(galleryUrl, galleryFilename);
            if (uploaded) {
              await prisma.image.create({
                data: { productID: product.id, image: uploaded },
              });
            }
          }
        }
      }

      console.log(`    Created: ${product.id}`);
    }

    created++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Variants created: ${created}`);
  console.log(`Already existed: ${skipped}`);
  console.log(`No config: ${skippedNotConfig}`);
  if (DRY_RUN) console.log('\n(Dry run — no data written)\n');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
