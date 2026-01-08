// Seed initial homepage cards from hardcoded data
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const initialCards = [
  {
    title: "Fat Big Quiz On Stage",
    description: "Live theatrical quiz experience. 90 minutes of entertainment with professional hosts and amazing prizes.",
    price: "From £15",
    href: "/on-stage",
    image: "/fat-big-quiz-event.png", // Local image for now
    badge: "Live Events",
    cardType: "EVENT",
    displayOrder: 0,
  },
  {
    title: "Quiz App",
    description: "Host quizzes with timed rounds, live scoring, QR code join, and real-time leaderboards. Free to start.",
    price: "Free",
    href: "https://app.fatbigquiz.com",
    badge: "Try Free",
    cardType: "APP",
    displayOrder: 1,
  },
  {
    title: "Weekly Quiz Pack",
    description: "Fresh quiz content delivered every week. Perfect for pubs and regular quiz nights.",
    price: "£4.99/mo",
    href: "/weekly-pack",
    badge: "Popular",
    cardType: "SUBSCRIPTION",
    displayOrder: 2,
  },
  {
    title: "Quiz Downloads",
    description: "One-off quiz packs for special occasions. Instant download after purchase.",
    price: "From £4.99",
    href: "/shop",
    badge: "Instant",
    cardType: "DOWNLOAD",
    displayOrder: 3,
  },
  {
    title: "Questions Database",
    description: "Access thousands of questions across hundreds of categories. Build your own quizzes.",
    price: "£9.99/mo",
    href: "/quiz-database",
    badge: "Pro",
    cardType: "SUBSCRIPTION",
    displayOrder: 4,
  },
  {
    title: "Free Questions",
    description: "Browse our blog for free quiz questions, tips, and inspiration.",
    price: "Free",
    href: "/blog",
    badge: "Free",
    cardType: "FREE",
    displayOrder: 5,
  },
];

async function seedHomepageCards() {
  console.log("Seeding homepage cards...");

  // Check if cards already exist
  const existingCount = await prisma.homepageCard.count();
  if (existingCount > 0) {
    console.log(`${existingCount} cards already exist. Skipping seed.`);
    return;
  }

  for (const card of initialCards) {
    await prisma.homepageCard.create({
      data: card,
    });
    console.log(`Created card: ${card.title}`);
  }

  console.log("Homepage cards seeded successfully!");
}

seedHomepageCards()
  .catch((error) => {
    console.error("Error seeding homepage cards:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
