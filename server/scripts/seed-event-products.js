/**
 * Seed Fat Big Quiz event products into the EventProduct tables.
 * Content sourced from the Wix BucketRace game catalogue page.
 *
 * Usage: node scripts/seed-event-products.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

async function seed() {
  console.log("[Seed] Seeding event products...");

  // Check if already seeded
  const existing = await prisma.eventProduct.findUnique({
    where: { slug: "on-stage-fat-big-quiz" },
  });
  if (existing) {
    console.log("[Seed] Fat Big Quiz On Stage already exists, skipping.");
    await prisma.$disconnect();
    return;
  }

  const productId = randomUUID();
  const packageId = randomUUID();

  // Create the main event product
  await prisma.eventProduct.create({
    data: {
      id: productId,
      slug: "on-stage-fat-big-quiz",
      name: "The Fat Big Quiz On Stage",
      description: `<p>The world's first theatrical, immersive, on-stage quiz... And it's literally got everything. We will take you on a hilarious and knowledge-bending real world quiz journey, with a mix of classic quiz style and quirky and creative trivia-tingling rounds.</p>
<p>For our on-stage quizzes we currently offer two themes: <strong>The Fat Big Quiz of Everything</strong>, and <strong>The Fat Big Quiz of Christmas</strong>. So make sure you've brushed up on the basics, and worked out those thumbs in order to show off your smarts in our staple quiz evening.</p>
<p>Our quiz takes players through ten, highly interactive rounds of in-person gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable, user-friendly, immersive experience.</p>
<p>The quiz format consists of five quirky creative rounds and five normal quiz-style rounds.</p>`,
      shortDesc: "The world's first theatrical, immersive, on-stage quiz show. 90 minutes of pure entertainment with ten interactive rounds.",
      coverImage: "on-stage-fat-big-quiz-hero.png",
      category: "quiz-show",
      themes: JSON.stringify(["Quiz Night", "Christmas", "Corporate", "Team Building"]),
      maxGroupSize: 500,
      duration: "90 minutes",
      isActive: true,
      displayOrder: 0,
    },
  });

  // Create a private booking package
  await prisma.eventPackage.create({
    data: {
      id: packageId,
      productId,
      name: "Private Quiz Show",
      slug: "private-quiz-show",
      description: "Full Fat Big Quiz On Stage experience at your venue. We bring all the equipment, staging, P.A. system, lighting, and quiz packs.",
      duration: "90 minutes",
      minPlayers: 20,
      maxPlayers: 500,
      bookingType: "PRIVATE",
      includes: JSON.stringify([
        "Professional quiz host",
        "Full P.A. system and lighting rig",
        "Professional stage setup and visuals",
        "Quiz packs, props, and game equipment",
        "Trophies for top three teams",
        "Bottle of bubbles for the winning team",
      ]),
      displayOrder: 0,
    },
  });

  // Create gallery images
  const images = [
    { url: "fat-big-quiz-on-stage-gallery-1.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 0 },
    { url: "fat-big-quiz-on-stage-gallery-2.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 1 },
    { url: "fat-big-quiz-on-stage-gallery-4.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 2 },
    { url: "fat-big-quiz-on-stage-gallery-6.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 3 },
    { url: "fat-big-quiz-on-stage-gallery-7.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 4 },
    { url: "fat-big-quiz-on-stage-gallery-9.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 5 },
    { url: "fat-big-quiz-on-stage-gallery-13.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 6 },
    { url: "fat-big-quiz-on-stage-gallery-14.jpeg", alt: "The Fat Big Quiz On Stage", sortOrder: 7 },
  ];

  for (const img of images) {
    await prisma.eventProductImage.create({
      data: { productId, ...img },
    });
  }

  // Create content sections
  const sections = [
    {
      title: "The Rounds",
      type: "cards",
      displayOrder: 0,
      isCollapsible: false,
      listItems: JSON.stringify([
        "1. History: Bog standard quiz questions, on-stage guests, external guest speakers, picture questions, and work out the quote.",
        "2. Say What You Can See: A collage of 'say what you can see' images, built around a scene themed for the season. Spot the high street brands!",
        "3. Music: Special guests, name that tune, song in reverse, finish the lyric, album covers, and face swap.",
        "4. Higher or Lower: Work out if the year a company was founded is higher or lower than the previous one shown.",
        "5. People: Fake news, inventors, stained glass, who is hiding in the shadows, and the fantastic jar of whatever.",
        "6. What a Load of Hot Air: Take a ride in our hot air balloon! Answer conspiracy theory questions correctly to soar, but get one wrong and you'll burst.",
        "7. TV / Film: Special guests, Paul Murphy reads 1-star reviews, face swap, say what you can see, and name the film from the strap-line.",
        "8. Fish Your Chips: Bet your points on head-to-head stage games! Fish colours from a rotating pond and nominate teammates to compete.",
        "9. Quirky Quick-fire: A rapid round of 10 quirky questions based on the quiz theme. Speed is everything!",
        "10. Toppers: How many number one rankers can you name? Top answer earns two points, second place earns one.",
      ]),
    },
    {
      title: "On Game Day",
      type: "text",
      displayOrder: 1,
      isCollapsible: true,
      content: `<p>On the day of the event we arrive <strong>3 hours before the start time</strong> to set up all of our equipment. This includes a full P.A. system, lighting, visuals based on the venue size, our stage, quiz packs, and various props and live quiz round equipment.</p>
<p>The quiz host takes teams through all ten rounds followed by the scores. The top three teams are awarded trophies, and the winning team also takes home a bottle of bubbles.</p>
<h4>What you'll need</h4>
<p>We advise having one smart device per team.</p>`,
    },
    {
      title: "Gallery",
      type: "gallery",
      displayOrder: 2,
      isCollapsible: false,
    },
    {
      title: "FAQ",
      type: "list",
      displayOrder: 3,
      isCollapsible: true,
      listItems: JSON.stringify([
        "How long is the show? - The Fat Big Quiz On Stage runs for approximately 90 minutes, including intervals.",
        "How many people can be on a team? - Teams can have between 2 and 6 players.",
        "What themes are available? - We currently offer The Fat Big Quiz of Everything, and The Fat Big Quiz of Christmas.",
        "What equipment do you bring? - Full P.A. system, lighting, visuals, stage, quiz packs, props, and live quiz round equipment.",
        "Do guests need anything? - Just one smart device per team for certain interactive rounds.",
        "Can I bring children? - Most shows are 18+ due to venue licensing. We occasionally run family-friendly shows.",
      ]),
    },
  ];

  for (const section of sections) {
    await prisma.eventProductSection.create({
      data: { productId, ...section },
    });
  }

  console.log("[Seed] Fat Big Quiz On Stage event product created successfully!");
  console.log(`[Seed] Product ID: ${productId}`);
  console.log(`[Seed] Slug: on-stage-fat-big-quiz`);
  console.log(`[Seed] URL: /events/on-stage-fat-big-quiz`);

  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
