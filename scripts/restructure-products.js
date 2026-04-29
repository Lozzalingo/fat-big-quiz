/**
 * Migration: Create Parent Products for Fat Big Quiz
 *
 * Creates 3 parent products (Fat Big Quiz, Game Shows, Whacky Wagers)
 * that serve as containers for event variants.
 *
 * Idempotent: checks by slug before creating. Does NOT modify existing products.
 *
 * Usage: node scripts/restructure-products.js
 */

const path = require('path');
const serverDir = path.join(__dirname, '..', 'server');
require(path.join(serverDir, 'node_modules', 'dotenv')).config({ path: path.join(serverDir, '.env') });
const { PrismaClient } = require(path.join(serverDir, 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient();

const PARENT_PRODUCTS = [
  {
    slug: 'fat-big-quiz',
    title: 'Fat Big Quiz',
    mainImage: 'fat-big-quiz-parent.jpg',
    price: 0,
    description: `<p>The classic quiz experience, reimagined for the modern age. Whether you're looking for a virtual quiz night from the comfort of your sofa, an in-person event that brings the whole team together, or a hybrid format that connects remote and on-site players — the Fat Big Quiz delivers every time. With rounds of trivia, picture rounds, music rounds, and more, every quiz is crafted to challenge, entertain, and spark friendly rivalry.</p>

<p>Our professional quiz hosts bring the energy, the banter, and the perfectly-paced questions that keep everyone engaged from the first round to the final answer. We handle the tech, the scoring, and the entertainment — you just show up and play. From intimate gatherings of 10 to corporate events of 500+, the Fat Big Quiz scales to fit any group.</p>

<p>Perfect for team building days, birthday celebrations, Christmas parties, and corporate away days. Choose from themed editions, seasonal specials, or let us build a bespoke quiz tailored to your group. Every Fat Big Quiz comes with a live leaderboard, interactive answer submissions, and enough laughs to last until the next one.</p>`,
    manufacturer: 'Fat Big Quiz',
    inStock: 1,
    isParent: true,
    productType: 'EVENT',
    eventFormat: 'HYBRID',
    displayOrder: 1,
  },
  {
    slug: 'game-shows',
    title: 'Game Shows',
    mainImage: 'game-shows-parent.jpg',
    price: 0,
    description: `<p>Professionally hosted interactive game shows that bring the excitement of television straight to your event. From Play Your Cards Right to Wheel of Fortune, from The Price is Right to our own original formats — every game show is produced with slick visuals, dramatic music, and a charismatic host who knows how to work the crowd. Available as virtual, in-person, or hybrid events to suit any setup.</p>

<p>Our game shows are fully interactive — contestants are pulled from the audience, teams compete head-to-head, and the stakes get higher with every round. Whether it's spinning the wheel, making the deal, or going all-in on a final gamble, every moment is designed to keep your guests on the edge of their seats. Professional production values mean big-screen graphics, sound effects, and that unmistakable game show atmosphere.</p>

<p>Ideal for corporate events, conferences, team socials, and private parties. Game shows work brilliantly as ice-breakers, after-dinner entertainment, or the main event itself. Each format can be customised with company branding, bespoke questions, and tailored challenges that make your event truly unique.</p>`,
    manufacturer: 'Fat Big Quiz',
    inStock: 1,
    isParent: true,
    productType: 'EVENT',
    eventFormat: 'HYBRID',
    displayOrder: 2,
  },
  {
    slug: 'whacky-wagers',
    title: 'Whacky Wagers',
    mainImage: 'whacky-wagers-parent.jpg',
    price: 0,
    description: `<p>Outrageous team challenges, wild bets, and laugh-out-loud competitive fun. Whacky Wagers is the ultimate ice-breaker for any group event — forget polite small talk, this is where colleagues become competitors, friends become rivals, and everyone discovers talents they never knew they had. Available virtually, in-person, or as a hybrid experience so no one misses out on the chaos.</p>

<p>Each Whacky Wagers session is packed with a rotating lineup of bizarre challenges, daring dares, and unpredictable wagers that keep the energy sky-high. Teams bet their points on their ability to complete increasingly ridiculous tasks — from blindfolded drawing competitions to speed-eating challenges, from lip-sync battles to the infamous "will they or won't they" dare rounds. The host keeps score, stokes the rivalry, and ensures maximum entertainment.</p>

<p>Whether you're breaking the ice at a conference, livening up a team-building day, or just looking for something completely different for your next event, Whacky Wagers guarantees an unforgettable experience. Groups of any size, any age, any level of competitiveness — everyone leaves with stories to tell and a newfound respect for their teammates' hidden talents.</p>`,
    manufacturer: 'Fat Big Quiz',
    inStock: 1,
    isParent: true,
    productType: 'EVENT',
    eventFormat: 'HYBRID',
    displayOrder: 3,
  },
];

async function main() {
  console.log('[Migration] Starting parent product creation...');
  console.log('[Migration] Products to create:', PARENT_PRODUCTS.map(p => p.title).join(', '));

  let created = 0;
  let skipped = 0;

  for (const product of PARENT_PRODUCTS) {
    try {
      // Check if parent already exists by slug (idempotent)
      const existing = await prisma.product.findUnique({
        where: { slug: product.slug },
      });

      if (existing) {
        console.log(`[Migration] SKIP - "${product.title}" already exists (id: ${existing.id})`);
        skipped++;
        continue;
      }

      const result = await prisma.product.create({
        data: {
          slug: product.slug,
          title: product.title,
          mainImage: product.mainImage,
          price: product.price,
          description: product.description,
          manufacturer: product.manufacturer,
          inStock: product.inStock,
          isParent: product.isParent,
          productType: product.productType,
          eventFormat: product.eventFormat,
          displayOrder: product.displayOrder,
          rating: 0,
        },
      });

      console.log(`[Migration] CREATED - "${result.title}" (id: ${result.id}, slug: ${result.slug})`);
      created++;
    } catch (error) {
      console.error(`[Migration] ERROR creating "${product.title}":`, error.message);
      throw error;
    }
  }

  console.log('[Migration] Complete.');
  console.log(`[Migration] Summary: ${created} created, ${skipped} skipped (already existed)`);
}

main()
  .catch((error) => {
    console.error('[Migration] Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    console.log('[Migration] Disconnecting from database...');
    await prisma.$disconnect();
  });
