/**
 * Fix virtual quiz products: video URLs, cover images, gallery images.
 * Run inside fatbigquiz_api container.
 */
require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// CDN image data keyed by slug
const productImages = {
  "virtual-quiz-love": {
    cover: "fat-big-virtual-quiz-love-cover.jpg",
    gallery: Array.from({ length: 12 }, (_, i) => `fat-big-virtual-quiz-love-gallery-${i + 1}.png`),
  },
  "virtual-quiz-christmas": {
    cover: "fat-big-virtual-quiz-christmas-cover.jpg",
    gallery: [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15].map(n => `fat-big-virtual-quiz-christmas-gallery-${n}.png`),
  },
  "virtual-quiz-halloween": {
    cover: "fat-big-virtual-quiz-halloween-cover.jpg",
    gallery: Array.from({ length: 17 }, (_, i) => `fat-big-virtual-quiz-halloween-gallery-${i + 1}.png`),
  },
  "virtual-quiz-easter": {
    cover: "fat-big-virtual-quiz-easter-cover.jpg",
    gallery: Array.from({ length: 15 }, (_, i) => `fat-big-virtual-quiz-easter-gallery-${i + 1}.png`),
  },
  "virtual-quiz-britain": {
    cover: "fat-big-virtual-quiz-britain-cover.jpg",
    gallery: Array.from({ length: 16 }, (_, i) => `fat-big-virtual-quiz-britain-gallery-${i + 1}.png`),
  },
  "virtual-quiz-europe": {
    cover: "fat-big-virtual-quiz-europe-cover.jpg",
    gallery: Array.from({ length: 16 }, (_, i) => `fat-big-virtual-quiz-europe-gallery-${i + 1}.png`),
  },
  "virtual-quiz-summer": {
    cover: "fat-big-virtual-quiz-summer-cover.jpg",
    gallery: Array.from({ length: 13 }, (_, i) => `fat-big-virtual-quiz-summer-gallery-${i + 1}.png`),
  },
  "virtual-quiz-spring": {
    cover: "fat-big-virtual-quiz-spring-cover.jpg",
    gallery: Array.from({ length: 13 }, (_, i) => `fat-big-virtual-quiz-spring-gallery-${i + 1}.png`),
  },
  "virtual-quiz-the-year": {
    cover: null, // No images on CDN for this product
    gallery: [],
  },
  "virtual-quiz-everything-1": {
    cover: "fat-big-virtual-quiz-everything-1-cover.jpg",
    gallery: Array.from({ length: 13 }, (_, i) => `fat-big-virtual-quiz-everything-1-gallery-${i + 1}.png`),
  },
  "virtual-quiz-everything-2": {
    cover: "fat-big-virtual-quiz-everything-2-cover.jpg",
    gallery: Array.from({ length: 14 }, (_, i) => `fat-big-virtual-quiz-everything-2-gallery-${i + 1}.png`),
  },
};

// Video URL fixes: convert shorts/ to watch?v=
const videoFixes = {
  "virtual-quiz-love": "https://www.youtube.com/watch?v=Uas9jvdUK6E",
  "virtual-quiz-christmas": "https://www.youtube.com/watch?v=4YLqCgTMpnM",
  "virtual-quiz-halloween": "https://www.youtube.com/watch?v=FVysiuahSF4",
  "virtual-quiz-easter": "https://www.youtube.com/watch?v=kN2nzqxU09Q",
  "virtual-quiz-britain": "https://www.youtube.com/watch?v=5asX3YH3RN0",
  "virtual-quiz-europe": "https://www.youtube.com/watch?v=ol6DlLDx5IY",
  "virtual-quiz-summer": "https://www.youtube.com/watch?v=HUFDj68M8uA",
  "virtual-quiz-spring": "https://www.youtube.com/watch?v=UsOyhoRwPGc",
  "virtual-quiz-the-year": "https://www.youtube.com/watch?v=HdIsfxbhxro",
};

async function fix() {
  console.log("[Fix] Updating virtual quiz products...");

  for (const [slug, data] of Object.entries(productImages)) {
    const product = await prisma.eventProduct.findUnique({ where: { slug } });
    if (!product) {
      console.log(`[Fix] Product ${slug} not found, skipping.`);
      continue;
    }

    console.log(`[Fix] Updating ${slug}...`);

    // 1. Set cover image
    if (data.cover) {
      await prisma.eventProduct.update({
        where: { slug },
        data: { coverImage: data.cover },
      });
      console.log(`[Fix]   Cover: ${data.cover}`);
    }

    // 2. Add gallery images (skip if already have images)
    const existingImages = await prisma.eventProductImage.count({ where: { productId: product.id } });
    if (existingImages === 0 && data.gallery.length > 0) {
      for (let i = 0; i < data.gallery.length; i++) {
        await prisma.eventProductImage.create({
          data: {
            productId: product.id,
            url: data.gallery[i],
            alt: product.name,
            sortOrder: i,
          },
        });
      }
      console.log(`[Fix]   Gallery: ${data.gallery.length} images added`);
    } else if (existingImages > 0) {
      console.log(`[Fix]   Gallery: already has ${existingImages} images, skipping`);
    } else {
      console.log(`[Fix]   Gallery: no images available on CDN`);
    }

    // 3. Fix video URL (shorts -> watch)
    if (videoFixes[slug]) {
      const videoSection = await prisma.eventProductSection.findFirst({
        where: { productId: product.id, type: "video" },
      });
      if (videoSection) {
        await prisma.eventProductSection.update({
          where: { id: videoSection.id },
          data: { content: videoFixes[slug] },
        });
        console.log(`[Fix]   Video: ${videoFixes[slug]}`);
      }
    }
  }

  console.log("[Fix] Done!");
  await prisma.$disconnect();
}

fix().catch((err) => {
  console.error("[Fix] Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
