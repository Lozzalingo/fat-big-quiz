/**
 * Seed initial QuizFormat records and migrate existing products
 * Run with: node server/scripts/seedQuizFormats.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const initialQuizFormats = [
  {
    name: "basic-quiz",
    displayName: "Basic Quiz",
    description: "A straightforward quiz format with questions and answers.",
    displayOrder: 1,
  },
  {
    name: "music-quiz",
    displayName: "Music Quiz",
    description: "Quiz format featuring audio clips and music-related questions.",
    displayOrder: 2,
  },
  {
    name: "fancy-quiz",
    displayName: "Fancy Quiz",
    description: "A premium quiz format with enhanced features and presentation.",
    displayOrder: 3,
  },
];

async function seedQuizFormats() {
  console.log("Seeding QuizFormat records...");

  for (const format of initialQuizFormats) {
    const existing = await prisma.quizFormat.findUnique({
      where: { name: format.name },
    });

    if (existing) {
      console.log(`  - ${format.displayName} already exists, skipping...`);
    } else {
      await prisma.quizFormat.create({
        data: format,
      });
      console.log(`  - Created: ${format.displayName}`);
    }
  }

  console.log("QuizFormat seeding complete!\n");
}

async function migrateProductCategories() {
  console.log("Migrating existing Product->Category relationships...");

  // Get all products with a categoryId
  const products = await prisma.product.findMany({
    where: {
      categoryId: { not: null },
    },
    select: { id: true, categoryId: true, title: true },
  });

  console.log(`  Found ${products.length} products with categories to migrate.`);

  let migrated = 0;
  let skipped = 0;

  for (const product of products) {
    if (!product.categoryId) continue;

    // Check if this relationship already exists in ProductCategory
    const existing = await prisma.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId: product.id,
          categoryId: product.categoryId,
        },
      },
    });

    if (existing) {
      skipped++;
    } else {
      await prisma.productCategory.create({
        data: {
          productId: product.id,
          categoryId: product.categoryId,
        },
      });
      migrated++;
    }
  }

  console.log(`  - Migrated: ${migrated} relationships`);
  console.log(`  - Skipped (already exist): ${skipped}`);
  console.log("Product->Category migration complete!\n");
}

async function main() {
  console.log("\n=== QuizFormat Migration Script ===\n");

  try {
    await seedQuizFormats();
    await migrateProductCategories();

    // Show summary
    const formatCount = await prisma.quizFormat.count();
    const productCategoryCount = await prisma.productCategory.count();

    console.log("=== Summary ===");
    console.log(`  QuizFormats in database: ${formatCount}`);
    console.log(`  ProductCategory relationships: ${productCategoryCount}`);
    console.log("\nMigration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
