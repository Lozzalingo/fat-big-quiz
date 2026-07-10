/**
 * Seed all Fat Big Virtual Quiz event products.
 * Each follows the same shared sections (How does it work, Themes, FAQ, What you'll need)
 * with unique Gallery, Description, Video (if available), and Rounds.
 *
 * Usage: cd server && node scripts/seed-virtual-quizzes.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();

// ─── Shared sections (same for every virtual quiz) ───

const sharedSections = [
  {
    title: "How does it work?",
    type: "steps",
    isCollapsible: true,
    listItems: JSON.stringify([
      "Confirm your theme, group size, location, and date.",
      "Book your game directly through our website.",
      "Complete the questionnaire (if you chose personalised questions).",
      "Check your inbox for a confirmation email with your video link.",
      "Join the video conference on your selected date and time.",
      "Enjoy the game as your host guides you through the experience.",
    ]),
  },
  {
    title: "Themes",
    type: "themes",
    isCollapsible: true,
  },
  {
    title: "FAQ",
    type: "faq",
    isCollapsible: true,
    listItems: JSON.stringify([
      "How long is the quiz? - Between 60 and 120 minutes.",
      "How many per team? - Between 2 and 6 players.",
      "What platform? - Zoom or Teams & YouTube broadcasting.",
      "Special equipment? - Two smart devices and internet.",
      "Can we customise? - Yes, for private bookings.",
      "Suitable for remote teams? - Absolutely!",
    ]),
  },
  {
    title: "What you'll need",
    type: "bullets",
    isCollapsible: true,
    listItems: JSON.stringify([
      "Two smart devices",
      "A good internet connection",
    ]),
  },
];

// ─── Product definitions ───

const virtualQuizzes = [
  {
    slug: "virtual-quiz-love",
    name: "The Fat Big Virtual Quiz of... Love",
    description: "<p>Roses are red, violets are blue, we have ten rounds of trivia, and they are all about you (and love).</p>",
    shortDesc: "Our Valentine's virtual quiz. Ten rounds of love-themed trivia, rom-com madness, and celebrity couple chaos.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/Uas9jvdUK6E",
    descriptionText: "Roses are red, violets are blue, we have ten rounds of love-themed trivia, and they are all for you. From rom-com madness to celebrity couple portmanteaus, this heart-warming special will have your teams swooning, competing, and laughing in equal measure.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Valentine's Gifts: Spot the hidden items in a love-themed collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "Llama Sutra: Name animals that mate for life, and their love-making positions.",
      "Food & Drink: Confectionery slogans, stained glass, name the poem, odd one out.",
      "Love in an Elevator: Name figurines emerging from the elevator of love.",
      "TV / Film: Rom-com themed. Face swap, comedy duo guest, strap-line from a film.",
      "Portmanteaumime: Celebrity couples in pantomime costumes. Name the portmanteaus.",
      "Quirky Quick-fire: 10 quirky questions on the love theme.",
      "All You Need Is Love: Match the title of love with the creator. Up to 20 points.",
    ],
    displayOrder: 2,
  },
  {
    slug: "virtual-quiz-christmas",
    name: "The Fat Big Virtual Quiz of... Christmas",
    description: "<p>Deck the halls with rounds of trivia, fa la la la la, la la la la.</p>",
    shortDesc: "Our festive virtual quiz. Christmas adverts, cracker jokes, and ten rounds of seasonal merriment.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/4YLqCgTMpnM",
    descriptionText: "Deck the halls with rounds of trivia! From Christmas adverts to cracker jokes, this festive special is packed with seasonal merriment. Whether you are hosting an office Christmas party or getting the family together, our quiz brings the festive cheer with ten interactive rounds of yuletide joy.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Christmas Items: Spot the hidden items in a Christmas-themed collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "Adverts: Name famous Christmas adverts across the years.",
      "People: Fake news, inventors, stained glass, Christmas characters.",
      "Charades: Name the charades and the Christmas number ones accompanying them.",
      "TV / Film: Literal movie name, video clip, face swap, strap-line from film.",
      "Christmas Crackers: Solve cracker jokes, then use those answers for a second question.",
      "Quirky Quick-fire: 10 quirky questions on Christmas.",
      "Toys: Order Christmas toys by the year they were the top seller.",
    ],
    displayOrder: 3,
  },
  {
    slug: "virtual-quiz-halloween",
    name: "The Fat Big Virtual Quiz of... Halloween",
    description: "<p>Things that go bump in the night... and ten rounds of spine-tingling trivia.</p>",
    shortDesc: "Our spooky virtual quiz. Cereal killers, horror villains, and ten rounds of ghoulish fun.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/FVysiuahSF4",
    descriptionText: "Things that go bump in the night, and ten rounds of spine-tingling trivia. From cereal killers (the pun) to horror movie villains, this ghoulish special will have your teams screaming with laughter. Fancy dress encouraged but not required.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Cereal Killers: Spot the hidden items in a cereal killer-themed collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "It's In Their Blood: Name the family based on ghoulish pictures of famous bloodlines.",
      "People: Fake news, inventors, celebrity fancy dress, famous quotes.",
      "Masqueraves: The host dons fancy dress masks with remixed horror soundtracks.",
      "TV / Film: Lost in translation, Paul Murphy 1-star review, face swap, strap-line.",
      "Witch, Bitch Is Which?: Dogs dressed as witches. Name the breed and the broom.",
      "Quirky Quick-fire: 10 quirky questions on Halloween.",
      "We're Making a Killing: Order infamous horror movie villains by on-screen kills.",
    ],
    displayOrder: 4,
  },
  {
    slug: "virtual-quiz-easter",
    name: "The Fat Big Virtual Quiz of... Easter",
    description: "<p>Hop to it! Ten rounds of egg-cellent trivia that will have your teams cracking up.</p>",
    shortDesc: "Our egg-cellent virtual quiz. Scrambled legs, chocolate collages, and ten rounds of Easter fun.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/kN2nzqxU09Q",
    descriptionText: "Hop to it! Ten rounds of egg-cellent trivia that will have your teams cracking up. From chocolate collages to cartoon character legs, this Easter special brings the fun with interactive rounds, daredevil challenges, and a resurrection twist.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Chocoholics: Spot the hidden items in a chocolate-themed collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "Scrambled Legs: Name the cartoon characters by only looking at their legs.",
      "Food & Drink: Fake news, inventors, the fantastic jar of miniature chocolate eggs.",
      "Are You Chicken?: Items pulled from eggs as clues. Daredevil-themed questions.",
      "TV / Film: Lego reenactment, Paul Murphy 1-star review, face swap, strap-line.",
      "Rabbiting On: A live remix with samples from famous rabbits. Name the ten rabbits.",
      "Quirky Quick-fire: 10 quirky questions on Easter.",
      "Resurrection: Answer correctly to earn points AND resurrect a previous wrong answer.",
    ],
    displayOrder: 5,
  },
  {
    slug: "virtual-quiz-britain",
    name: "The Fat Big Virtual Quiz of... Britain",
    description: "<p>Keep calm and quiz on. Ten rounds celebrating the very best (and quirkiest) of Britain.</p>",
    shortDesc: "Our British virtual quiz. James Bond supermarkets, cricket controversies, and ten rounds of Britishness.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/5asX3YH3RN0",
    descriptionText: "Keep calm and quiz on. Ten rounds celebrating the very best (and quirkiest) of Britain. From James Bond villains hiding in British supermarkets to sporting controversies and monarch-themed brain teasers, this patriotic special is packed with British icons, culture, and a healthy dose of silliness.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "British Icons: Spot the hidden items in a British Icons-themed collage!",
      "Top of the Props: Famous props combined with music of the pops. Name the owners.",
      "Fish Your Chips: Bet points on questions about what Britain is known for.",
      "People: Fake news, inventors, confectionery slogans, stained glass, odd one out.",
      "It's Just Not Cricket: Name the match, tournament and team from a sporting snippet.",
      "TV / Film: Paul Murphy 1-star review, face swap, what happens next, strap-line.",
      "007/11: Name the James Bond film based on the villain hiding in a British supermarket.",
      "Quirky Spit Fire: 10 quirky quick-fire questions on Britain.",
      "Monarch-key: Link monarchs with their house to unlock Big Breakfast components.",
    ],
    displayOrder: 6,
  },
  {
    slug: "virtual-quiz-europe",
    name: "The Fat Big Virtual Quiz of... Europe",
    description: "<p>From Paris to Prague, ten rounds of continental trivia that will take you on a tour of Europe.</p>",
    shortDesc: "Our European virtual quiz. Monuments, national dishes, and ten rounds of continental adventure.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/ol6DlLDx5IY",
    descriptionText: "From Paris to Prague, ten rounds of continental trivia that will take you on a grand tour of Europe. From famous monuments and national dishes to European leaders disguised as Pokemon, this quiz is your passport to an evening of culture, competition, and plenty of laughs.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "European Capitals: Spot the hidden items in a European capitals collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "Monuentalist: Name European magicians and monuments from a magical animation.",
      "Food & Drink: Fake news, inventors, name the national dish, spell the dip.",
      "The Grass Isn't Always Greener: Name celebrity figurines' alternative careers on a subbuteo pitch.",
      "TV / Film: Paul Murphy 1-star review, face swap, say what you can see, strap-line.",
      "Who's That Polimon?: Guess famous European leaders presented as shadowed Pokemon.",
      "Quirky Quick-fire: 10 quirky questions on Europe.",
      "Size It Up: List European countries smallest to largest.",
    ],
    displayOrder: 7,
  },
  {
    slug: "virtual-quiz-summer",
    name: "The Fat Big Virtual Quiz of... Summer",
    description: "<p>Sun's out, quiz out. Ten rounds of sizzling trivia to heat up your summer.</p>",
    shortDesc: "Our summer virtual quiz. BBQ celebrities, beach pixel art, and ten rounds of sun-soaked fun.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/HUFDj68M8uA",
    descriptionText: "Sun's out, quiz out. Ten rounds of sizzling trivia to heat up your summer. From celebrities on a BBQ spit roast to pixel art beach scenes and hot air balloon rides, this sun-soaked special brings the warmth with interactive rounds and plenty of summer vibes.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Summer Loving: Spot the hidden items in a summer loving collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "Barbecue Card: Cue cards rotating on a BBQ spit roast a celebrity. Name them.",
      "People: Odd one out, inventors, how many seconds of summer, name this summer.",
      "What a Load of Hot Air: Hot air balloon ride. Answer conspiracy theories to soar!",
      "TV / Film: Paul Murphy 1-star review, face swap, stained glass, strap-line.",
      "Beach Ready Player One: Pixel art beach with protagonists from top-selling games.",
      "Quirky Quick-fire: 10 quirky questions on summer.",
      "Feeling Hot Hot Hot: Rank countries by highest ever recorded temperature.",
    ],
    displayOrder: 8,
  },
  {
    slug: "virtual-quiz-spring",
    name: "The Fat Big Virtual Quiz of... Spring",
    description: "<p>Spring has sprung! Ten rounds of fresh trivia to shake off the winter cobwebs.</p>",
    shortDesc: "Our spring virtual quiz. April fools, bee factories, and ten rounds of fresh seasonal fun.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/UsOyhoRwPGc",
    descriptionText: "Spring has sprung! Ten rounds of fresh trivia to shake off the winter cobwebs. From April fools and bee factory conveyor belts to emergency vehicle fly-overs and Springfield collages, this springtime special is bursting with colour, creativity, and competition.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Not In Springfield: Spot the hidden items in a Springfield-themed collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "April Fools: 10 comedians combined into one foolish figure. Identify them.",
      "People: Fake news, inventors, stained glass, lurking in the shadows, Dandy lion.",
      "Absolutely Buzzing: Bee factory conveyor belt. Items beginning with B introduce questions.",
      "TV / Film: Paul Murphy 1-star review, face swap, what happens next, strap-line.",
      "May Day, May Day, May Day: Fly over a Lego village. Emergency services questions.",
      "Quirky Quick-fire: 10 quirky questions on spring.",
      "You're Getting Warmer: List items from coldest to hottest.",
    ],
    displayOrder: 9,
  },
  {
    slug: "virtual-quiz-the-year",
    name: "The Fat Big Virtual Quiz of... The Year",
    description: "<p>The year in review! Ten rounds covering the headlines, hits, and hilarity of the past twelve months.</p>",
    shortDesc: "Our end-of-year virtual quiz. Headlines, quotes, and ten rounds of the year's biggest moments.",
    coverImage: null,
    video: "https://www.youtube.com/shorts/HdIsfxbhxro",
    descriptionText: "The year in review! Ten rounds covering the headlines, hits, and hilarity of the past twelve months. From anti-faxers and sporting achievements to the most ridiculous quotes of the year, this annual special is the perfect way to round off your year with a bang.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "Headlines: Bog standard quiz questions, fake news, picture questions, fill in the blanks.",
      "Say What You Can See: Spot the hidden items in a year-themed collage!",
      "Music: Song backward, finish the lyric, intro from song, theme tune, album covers.",
      "Bespoke Creative Round: Designed around this year's biggest events and talking points.",
      "People: Stained glass, lurking in the shadows, went viral, who's this celebrity?",
      "Higher or Lower: Name sporting achievements, then higher or lower than the previous card.",
      "TV / Film: Literal movie name, video clip, face swap, say what you see, strap-line.",
      "Quotes: Who said the most ridiculous things this year?",
      "Quirky Quick-fire: 10 quirky questions on the year.",
      "Toppers: Name number one rankers. Top answer earns 2 points, second earns 1.",
    ],
    displayOrder: 10,
  },
  {
    slug: "virtual-quiz-everything-1",
    name: "The Fat Big Virtual Quiz of... Everything (Vol. 1)",
    description: "<p>A bit of everything! Ten rounds of general knowledge with our quirkiest creative twists.</p>",
    shortDesc: "Our general knowledge virtual quiz. Sporting legends, Pixar protagonists, and ten rounds of everything.",
    coverImage: null,
    video: null,
    descriptionText: "A bit of everything! Ten rounds of general knowledge with our quirkiest creative twists. From sporting legend collages to Pixar protagonist challenges, this all-rounder is perfect for groups who want a mix of classic trivia and creative madness.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "Sporting Legends: Spot the hidden items in a sporting legends collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "What Happens Next: Guess what happens next in unexpected moments caught on camera.",
      "People: Fake news, inventors, stained glass, who said it, punception.",
      "Cartoons: Spliced visuals from one cartoon with the opening music of another. Name both.",
      "TV / Film: Lost in translation, Paul Murphy 1-star review, face swap, strap-line.",
      "Monuments: Picture round of famous monuments.",
      "Quirky Quick-fire: 10 quirky questions on general knowledge.",
      "Catch Em' All: Name main protagonists from Pixar films.",
    ],
    displayOrder: 11,
  },
  {
    slug: "virtual-quiz-everything-2",
    name: "The Fat Big Virtual Quiz of... Everything (Vol. 2)",
    description: "<p>Even more of everything! Ten fresh rounds of general knowledge with brand new creative twists.</p>",
    shortDesc: "Our general knowledge sequel. High street brands, retitled books, and ten rounds of everything.",
    coverImage: null,
    video: null,
    descriptionText: "Even more of everything! Ten fresh rounds of general knowledge with brand new creative twists. From high street brand collages to dog breeds that rhyme with cities and famous books retitled using a thesaurus, this sequel brings ten all-new rounds of chaos and competition.\n\nOur quiz takes players through ten, highly interactive rounds of virtual gameplay. Using video, audio, special guests, graphics, guest presenters, and live triggers, along with the latest in broadcasting and design software, we bring our players a truly memorable user-friendly, immersive, experience.\n\nThe quizzes format consists of five quirky creative rounds and 5 normal quiz style rounds.",
    rounds: [
      "History: Bog standard quiz questions, picture questions, fill in the blanks.",
      "High Street Brands: Spot the hidden items in a high street brands collage!",
      "Music: Name that tune, song in reverse, finish the lyric, album covers.",
      "Land Barks: Name the dog breed and city (by landmarks). They all rhyme!",
      "People: Fake news, inventors, stained glass, special guest, magic show.",
      "Train of Thought: A miniature model train delivers clue items. Spot the hidden link.",
      "TV / Film: Paul Murphy 1-star review, emoji game, say what you can see, strap-line.",
      "Retitled: Famous book titles renamed using a thesaurus. Name the originals.",
      "Quirky Quick-fire: 10 quirky questions on general knowledge.",
      "Wonder Vision: Name wonders of the world. Pick your top 5 for double points.",
    ],
    displayOrder: 12,
  },
];

// ─── Themes list (shared across all virtual quizzes) ───

const allThemes = [
  "Everything 1", "Everything 2", "Europe", "Britain", "Valentines",
  "Spring", "Easter", "Summer", "Halloween", "Fireworks & Fall",
  "Christmas", "New Year",
];

async function seed() {
  console.log("[Seed] Seeding virtual quiz event products...");

  for (const quiz of virtualQuizzes) {
    // Check if already exists
    const existing = await prisma.eventProduct.findUnique({
      where: { slug: quiz.slug },
    });
    if (existing) {
      console.log(`[Seed] ${quiz.slug} already exists, skipping.`);
      continue;
    }

    const productId = randomUUID();
    const packageId = randomUUID();

    console.log(`[Seed] Creating ${quiz.name}...`);

    // Create event product
    await prisma.eventProduct.create({
      data: {
        id: productId,
        slug: quiz.slug,
        name: quiz.name,
        description: quiz.description,
        shortDesc: quiz.shortDesc,
        coverImage: quiz.coverImage,
        category: "quiz-show",
        themes: JSON.stringify(allThemes),
        maxGroupSize: 500,
        duration: "90 minutes",
        isActive: true,
        displayOrder: quiz.displayOrder,
      },
    });

    // Create private booking package (same terms as Fireworks & Fall)
    await prisma.eventPackage.create({
      data: {
        id: packageId,
        productId,
        name: "Private Virtual Quiz",
        slug: "private-virtual-quiz",
        description: "Full Fat Big Virtual Quiz experience hosted over Zoom.",
        duration: "90 minutes",
        minPlayers: 8,
        maxPlayers: 500,
        pricePerPerson: 2500,
        minReserve: 20000,
        bookingType: "PRIVATE",
        includes: null,
        displayOrder: 0,
      },
    });

    // Build sections
    let sectionOrder = 0;

    // 1. Gallery (no images yet, but section placeholder)
    await prisma.eventProductSection.create({
      data: {
        productId,
        title: "Gallery",
        type: "gallery",
        isCollapsible: false,
        displayOrder: sectionOrder++,
      },
    });

    // 2. Description
    await prisma.eventProductSection.create({
      data: {
        productId,
        title: "Description",
        type: "text",
        content: quiz.descriptionText,
        isCollapsible: true,
        displayOrder: sectionOrder++,
      },
    });

    // 3. Watch the Trailer (if video exists)
    if (quiz.video) {
      await prisma.eventProductSection.create({
        data: {
          productId,
          title: "Watch the Trailer",
          type: "video",
          content: quiz.video,
          isCollapsible: false,
          displayOrder: sectionOrder++,
        },
      });
    }

    // 4. The Rounds
    await prisma.eventProductSection.create({
      data: {
        productId,
        title: "The Rounds",
        type: "cards",
        listItems: JSON.stringify(quiz.rounds),
        isCollapsible: false,
        displayOrder: sectionOrder++,
      },
    });

    // 5-8. Shared sections
    for (const shared of sharedSections) {
      await prisma.eventProductSection.create({
        data: {
          productId,
          title: shared.title,
          type: shared.type,
          content: shared.content || null,
          listItems: shared.listItems || null,
          isCollapsible: shared.isCollapsible,
          displayOrder: sectionOrder++,
        },
      });
    }

    console.log(`[Seed] Created: ${quiz.name} (${quiz.slug})`);
    console.log(`[Seed]   URL: /events/${quiz.slug}`);
  }

  console.log("[Seed] Done! All virtual quiz products seeded.");
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error("[Seed] Error:", err);
  prisma.$disconnect();
  process.exit(1);
});
