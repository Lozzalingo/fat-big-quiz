/**
 * Seed QuizCategory, QuizSubCategory, QuizCountry, QuizTheme, QuizSource records
 * Run with: node server/scripts/seedQuizDatabase.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Categories (26 from quiz question generator) ───────────────────────────

const categories = [
  "Arts & Literature",
  "Autos and Vehicles",
  "Beauty and Fashion",
  "Business and Finance",
  "Climate",
  "Entertainment",
  "Food and Drink",
  "Games",
  "Geography",
  "Health & Fitness",
  "History",
  "Hobbies and Leisure",
  "Internet",
  "Jobs and Education",
  "Law and Government",
  "Music",
  "News",
  "Pets and Animals",
  "Politics",
  "Science",
  "Shopping",
  "Social Media",
  "Sports",
  "Technology",
  "Travel and Transportation",
  "Weird & Random",
];

// ─── Sub-categories (180+ from quiz question generator) ─────────────────────
// Mapped to parent categories where obvious, null otherwise

const subCategories = [
  // Sports
  { name: "Football", category: "Sports" },
  { name: "Women's Football", category: "Sports" },
  { name: "NBA", category: "Sports" },
  { name: "NFL", category: "Sports" },
  { name: "MLB", category: "Sports" },
  { name: "NASCAR", category: "Sports" },
  { name: "Cricket", category: "Sports" },
  { name: "Rugby League", category: "Sports" },
  { name: "Rugby Union", category: "Sports" },
  { name: "F1", category: "Sports" },
  { name: "Cycling", category: "Sports" },
  { name: "Boxing", category: "Sports" },
  { name: "Darts", category: "Sports" },
  { name: "Swimming", category: "Sports" },
  { name: "Tennis", category: "Sports" },
  { name: "Golf", category: "Sports" },
  { name: "Hockey", category: "Sports" },
  { name: "Ice Hockey", category: "Sports" },
  { name: "Horses", category: "Sports" },
  { name: "Snooker", category: "Sports" },
  { name: "MMA", category: "Sports" },
  { name: "WWE", category: "Sports" },
  { name: "Olympics", category: "Sports" },
  { name: "Winter Sports", category: "Sports" },
  { name: "Bowls", category: "Sports" },
  { name: "Baseball", category: "Sports" },
  { name: "Basketball", category: "Sports" },
  { name: "Racing", category: "Sports" },
  { name: "Esports", category: "Sports" },
  { name: "Betting", category: "Sports" },

  // Entertainment
  { name: "Movies", category: "Entertainment" },
  { name: "TV Shows", category: "Entertainment" },
  { name: "Reality TV", category: "Entertainment" },
  { name: "Awards Shows", category: "Entertainment" },
  { name: "Critics Choice", category: "Entertainment" },
  { name: "Red Carpet", category: "Entertainment" },
  { name: "Celebrity", category: "Entertainment" },
  { name: "Comedy", category: "Entertainment" },
  { name: "Bollywood", category: "Entertainment" },
  { name: "Documentaries", category: "Entertainment" },
  { name: "Theater", category: "Entertainment" },
  { name: "Pop Culture", category: "Entertainment" },
  { name: "Nostalgia", category: "Entertainment" },
  { name: "Streaming", category: "Entertainment" },

  // Music
  { name: "Pop", category: "Music" },
  { name: "Rock", category: "Music" },
  { name: "Hip-Hop", category: "Music" },
  { name: "Rap", category: "Music" },
  { name: "R&B", category: "Music" },
  { name: "Country", category: "Music" },
  { name: "Jazz", category: "Music" },
  { name: "Blues", category: "Music" },
  { name: "Classical", category: "Music" },
  { name: "Metal", category: "Music" },
  { name: "Punk", category: "Music" },
  { name: "Reggae", category: "Music" },
  { name: "Soul", category: "Music" },
  { name: "Funk", category: "Music" },
  { name: "Indie", category: "Music" },
  { name: "K-Pop", category: "Music" },
  { name: "Afrobeats", category: "Music" },
  { name: "Dance", category: "Music" },
  { name: "Dubstep", category: "Music" },
  { name: "Techno", category: "Music" },
  { name: "Trance", category: "Music" },
  { name: "Folk", category: "Music" },
  { name: "Gospel", category: "Music" },
  { name: "Latin", category: "Music" },
  { name: "World Music", category: "Music" },

  // Technology
  { name: "AI", category: "Technology" },
  { name: "Apps", category: "Technology" },
  { name: "Cybersecurity", category: "Technology" },
  { name: "Startups", category: "Technology" },
  { name: "Software", category: "Technology" },
  { name: "Gadgets", category: "Technology" },
  { name: "Electronics", category: "Technology" },
  { name: "Smartphones", category: "Technology" },
  { name: "Data Breaches", category: "Technology" },
  { name: "Hacking", category: "Technology" },
  { name: "Robots", category: "Technology" },
  { name: "PC Gaming", category: "Games" },
  { name: "Console Gaming", category: "Games" },
  { name: "Computer Games", category: "Games" },
  { name: "Nintendo", category: "Games" },
  { name: "Xbox", category: "Games" },

  // Politics
  { name: "Elections", category: "Politics" },
  { name: "Democrats", category: "Politics" },
  { name: "Republicans", category: "Politics" },
  { name: "Labour", category: "Politics" },
  { name: "Conservatives", category: "Politics" },
  { name: "Liberal Democrats", category: "Politics" },
  { name: "Reform", category: "Politics" },
  { name: "The Green Party", category: "Politics" },
  { name: "Donald Trump", category: "Politics" },
  { name: "The White House", category: "Politics" },
  { name: "The Supreme Court", category: "Politics" },
  { name: "Downing Street", category: "Politics" },
  { name: "Midterms", category: "Politics" },
  { name: "Policy", category: "Politics" },
  { name: "Legislation", category: "Politics" },
  { name: "Immigration", category: "Politics" },

  // Business and Finance
  { name: "Stocks", category: "Business and Finance" },
  { name: "Bonds", category: "Business and Finance" },
  { name: "Crypto", category: "Business and Finance" },
  { name: "Currency", category: "Business and Finance" },
  { name: "Indices", category: "Business and Finance" },
  { name: "Commodities", category: "Business and Finance" },
  { name: "Personal Finance", category: "Business and Finance" },
  { name: "Mortgages", category: "Business and Finance" },
  { name: "Real Estate", category: "Business and Finance" },
  { name: "Budget", category: "Business and Finance" },
  { name: "Inflation", category: "Business and Finance" },
  { name: "The Federal Reserve", category: "Business and Finance" },
  { name: "Companies", category: "Business and Finance" },
  { name: "Entrepreneurship", category: "Business and Finance" },
  { name: "Economy", category: "Business and Finance" },
  { name: "Finance", category: "Business and Finance" },

  // Science
  { name: "Space", category: "Science" },
  { name: "Space Force", category: "Science" },
  { name: "Medicine", category: "Science" },
  { name: "Research", category: "Science" },
  { name: "Futurology", category: "Science" },

  // Health & Fitness
  { name: "Nutrition", category: "Health & Fitness" },
  { name: "Fitness", category: "Health & Fitness" },

  // Pets and Animals
  { name: "Marine Life", category: "Pets and Animals" },
  { name: "Animals", category: "Pets and Animals" },

  // Arts & Literature
  { name: "Architecture", category: "Arts & Literature" },
  { name: "Photography", category: "Arts & Literature" },
  { name: "Books", category: "Arts & Literature" },
  { name: "Comics", category: "Arts & Literature" },
  { name: "Art", category: "Arts & Literature" },
  { name: "Design", category: "Arts & Literature" },

  // Social Media
  { name: "Memes", category: "Social Media" },
  { name: "Viral", category: "Social Media" },
  { name: "TikTok", category: "Social Media" },
  { name: "Reddit", category: "Social Media" },
  { name: "YouTube", category: "Social Media" },
  { name: "Twitter/X", category: "Social Media" },
  { name: "Podcasts", category: "Social Media" },
  { name: "Influencers", category: "Social Media" },

  // News
  { name: "Headlines", category: "News" },
  { name: "Crime", category: "News" },
  { name: "True Crime", category: "News" },
  { name: "Good News", category: "News" },
  { name: "Disasters", category: "News" },
  { name: "Controversy", category: "News" },
  { name: "Corruption", category: "News" },
  { name: "Satire", category: "News" },
  { name: "Hoaxes", category: "News" },
  { name: "Misinformation", category: "News" },
  { name: "Conspiracy Theories", category: "News" },
  { name: "Public Figure", category: "News" },
  { name: "Public Service", category: "News" },

  // Weird & Random
  { name: "Bizarre", category: "Weird & Random" },
  { name: "Oddities", category: "Weird & Random" },
  { name: "Records", category: "Weird & Random" },
  { name: "Predictions", category: "Weird & Random" },
  { name: "Trends", category: "Weird & Random" },

  // Geography
  { name: "Cities", category: "Geography" },
  { name: "Towns", category: "Geography" },
  { name: "Villages", category: "Geography" },
  { name: "The Arctic", category: "Geography" },
  { name: "Europe", category: "Geography" },
  { name: "Ukraine", category: "Geography" },
  { name: "Israel", category: "Geography" },
  { name: "Venezuela", category: "Geography" },
  { name: "China", category: "Geography" },
  { name: "World", category: "Geography" },

  // Climate
  { name: "Weather", category: "Climate" },
  { name: "Environment", category: "Climate" },
  { name: "Energy", category: "Climate" },

  // Law and Government
  { name: "NATO", category: "Law and Government" },
  { name: "APEC", category: "Law and Government" },
  { name: "The United Nations", category: "Law and Government" },
  { name: "Military", category: "Law and Government" },
  { name: "Safety", category: "Law and Government" },
  { name: "Infrastructure", category: "Law and Government" },

  // Travel and Transportation
  { name: "Airlines", category: "Travel and Transportation" },
  { name: "Aviation", category: "Travel and Transportation" },
  { name: "Cars", category: "Travel and Transportation" },
  { name: "Electric Vehicles", category: "Travel and Transportation" },
  { name: "Cruises", category: "Travel and Transportation" },
  { name: "Transportation", category: "Travel and Transportation" },
  { name: "Travel", category: "Travel and Transportation" },

  // Hobbies and Leisure
  { name: "Toys", category: "Hobbies and Leisure" },
  { name: "Hobbies", category: "Hobbies and Leisure" },
  { name: "Events", category: "Hobbies and Leisure" },

  // Food and Drink
  { name: "Restaurants", category: "Food and Drink" },
  { name: "Drinks", category: "Food and Drink" },
  { name: "Consumer", category: "Food and Drink" },

  // Jobs and Education
  { name: "Jobs", category: "Jobs and Education" },
  { name: "Education", category: "Jobs and Education" },

  // Beauty and Fashion
  { name: "Fashion", category: "Beauty and Fashion" },
  { name: "Beauty", category: "Beauty and Fashion" },

  // Internet
  { name: "Dating", category: "Internet" },
  { name: "Relationships", category: "Internet" },
  { name: "Gaming", category: "Internet" },

  // Shopping
  { name: "Shopping", category: "Shopping" },

  // History
  { name: "Ancient", category: "History" },
  { name: "Birthdays", category: "History" },

  // Misc - not clearly in one category
  { name: "Religion", category: null },
  { name: "Faith", category: null },
];

// ─── Countries ──────────────────────────────────────────────────────────────

const countries = [
  { name: "World", code: "WORLD" },
  { name: "United Kingdom", code: "UK" },
  { name: "United States", code: "US" },
  { name: "Canada", code: "CA" },
  { name: "Australia", code: "AU" },
  { name: "Ireland", code: "IE" },
  { name: "New Zealand", code: "NZ" },
];

// ─── Themes/Seasons (from BucketRace seasonal pipeline) ─────────────────────

const themes = [
  // Year-round default
  { name: "General", months: null },

  // January
  { name: "New Year's Day", months: [0] },
  { name: "Dry January", months: [0] },
  { name: "Veganuary", months: [0] },
  { name: "Burns Night", months: [0] },
  { name: "Chinese New Year", months: [0, 1] },
  { name: "Lunar New Year", months: [0, 1] },

  // February
  { name: "Valentine's Day", months: [1] },
  { name: "Pancake Day", months: [1] },
  { name: "Shrove Tuesday", months: [1] },
  { name: "LGBT History Month", months: [1] },
  { name: "Six Nations", months: [1, 2] },
  { name: "Brit Awards", months: [1] },
  { name: "BAFTA Awards", months: [1] },
  { name: "Fashion Week", months: [1, 8] },

  // March
  { name: "Mother's Day", months: [2] },
  { name: "St Patrick's Day", months: [2] },
  { name: "International Women's Day", months: [2] },
  { name: "World Book Day", months: [2] },
  { name: "Cheltenham Festival", months: [2] },
  { name: "Comic Relief", months: [2] },
  { name: "Crufts", months: [2] },
  { name: "Ramadan", months: [2, 3] },

  // March-April
  { name: "Easter", months: [2, 3] },

  // April
  { name: "London Marathon", months: [3] },
  { name: "Grand National", months: [3] },
  { name: "Boat Race", months: [3] },
  { name: "St George's Day", months: [3] },
  { name: "Earth Day", months: [3] },
  { name: "April Fool's Day", months: [3] },
  { name: "FA Cup", months: [3, 4] },

  // May
  { name: "May Bank Holiday", months: [4] },
  { name: "VE Day", months: [4] },
  { name: "Chelsea Flower Show", months: [4] },
  { name: "Eurovision", months: [4] },
  { name: "Mental Health Awareness Week", months: [4] },
  { name: "Hay Festival", months: [4] },

  // June
  { name: "Glastonbury", months: [5] },
  { name: "Royal Ascot", months: [5] },
  { name: "Pride Month", months: [5, 6] },
  { name: "Father's Day", months: [5] },
  { name: "Trooping the Colour", months: [5] },
  { name: "Summer Solstice", months: [5] },

  // June-July
  { name: "Wimbledon", months: [5, 6] },

  // July
  { name: "British Grand Prix", months: [6] },
  { name: "Henley Royal Regatta", months: [6] },
  { name: "The Open Championship", months: [6] },
  { name: "Summer Holidays", months: [6, 7] },

  // August
  { name: "Edinburgh Fringe", months: [7] },
  { name: "Edinburgh Military Tattoo", months: [7] },
  { name: "Notting Hill Carnival", months: [7] },
  { name: "Reading and Leeds Festival", months: [7] },
  { name: "A-Level Results Day", months: [7] },
  { name: "GCSE Results Day", months: [7] },
  { name: "Premier League Season Start", months: [7] },
  { name: "Transfer Deadline Day", months: [7] },
  { name: "BBC Proms", months: [7] },

  // September
  { name: "London Fashion Week", months: [8] },
  { name: "Freshers Week", months: [8] },
  { name: "Macmillan Coffee Morning", months: [8] },
  { name: "Great North Run", months: [8] },
  { name: "Great British Bake Off", months: [8] },
  { name: "Harvest Festival", months: [8] },
  { name: "Back to School", months: [8] },

  // October
  { name: "Halloween", months: [9] },
  { name: "Black History Month", months: [9] },
  { name: "Diwali", months: [9, 10] },
  { name: "Oktoberfest", months: [9] },
  { name: "London Film Festival", months: [9] },
  { name: "National Curry Week", months: [9] },

  // November
  { name: "Bonfire Night", months: [10] },
  { name: "Remembrance Day", months: [10] },
  { name: "Black Friday", months: [10] },
  { name: "Cyber Monday", months: [10] },
  { name: "Children in Need", months: [10] },
  { name: "Movember", months: [10] },
  { name: "COP Climate Summit", months: [10] },
  { name: "Autumn Internationals", months: [10] },

  // December
  { name: "Christmas", months: [11] },
  { name: "Boxing Day", months: [11] },
  { name: "Advent", months: [11] },
  { name: "Hanukkah", months: [11] },
  { name: "Winter Wonderland", months: [11] },
  { name: "New Year's Eve", months: [11] },
  { name: "Hogmanay", months: [11] },
  { name: "Pantomime Season", months: [11] },
  { name: "Christmas Jumper Day", months: [11] },
];

// ─── Sources ────────────────────────────────────────────────────────────────

const sources = [
  { name: "BBC Football", slug: "bbc-football", url: "https://www.bbc.co.uk/sport/football" },
  { name: "CNN Quiz", slug: "cnn-quiz", url: "https://cnn.it/5thingsquiz" },
  { name: "Guardian News Quiz", slug: "guardian-news-quiz", url: "https://www.theguardian.com/lifeandstyle/series/thursday-quiz" },
  { name: "Guardian Sports Quiz", slug: "guardian-sports-quiz", url: "https://www.theguardian.com/sport/series/sports-quiz-of-the-week" },
  { name: "Guardian Kids Quiz", slug: "guardian-kids-quiz", url: "https://www.theguardian.com/lifeandstyle/series/the-kids--quiz" },
  { name: "Guardian Thomas Eaton", slug: "guardian-thomas-eaton", url: "https://www.theguardian.com/theguardian/series/the-quiz-thomas-eaton" },
  { name: "Guardian Newsquiz", slug: "guardian-newsquiz", url: "https://www.theguardian.com/news/series/newsquiz" },
  { name: "Guardian Christmas", slug: "guardian-christmas", url: "https://www.theguardian.com/lifeandstyle/series/christmas-puzzles-special-2025" },
  { name: "Guardian Standalone", slug: "guardian-standalone", url: "https://www.theguardian.com/tone/quizzes" },
  { name: "NPR Quiz", slug: "npr-quiz", url: "https://www.npr.org/series/1146192567/weekly-news-quiz" },
  { name: "NYT Quiz", slug: "nyt-quiz", url: "https://www.nytimes.com" },
  { name: "FBQ Blog", slug: "fbq-blog", url: "https://fatbigquiz.com/blog" },
];

// ─── Seed Function ──────────────────────────────────────────────────────────

async function seedQuizDatabase() {
  console.log("[QuizDB] Starting quiz database seed...");

  // Seed categories
  console.log("[QuizDB] Seeding categories...");
  const categoryMap = {};
  for (let i = 0; i < categories.length; i++) {
    const name = categories[i];
    const result = await prisma.quizCategory.upsert({
      where: { name },
      update: { displayOrder: i + 1 },
      create: {
        name,
        slug: slugify(name),
        displayOrder: i + 1,
      },
    });
    categoryMap[name] = result.id;
  }
  console.log(`[QuizDB] Seeded ${categories.length} categories`);

  // Seed sub-categories
  console.log("[QuizDB] Seeding sub-categories...");
  let subCatCount = 0;
  for (const sub of subCategories) {
    await prisma.quizSubCategory.upsert({
      where: { name: sub.name },
      update: {
        categoryId: sub.category ? categoryMap[sub.category] || null : null,
      },
      create: {
        name: sub.name,
        slug: slugify(sub.name),
        categoryId: sub.category ? categoryMap[sub.category] || null : null,
        displayOrder: subCatCount + 1,
      },
    });
    subCatCount++;
  }
  console.log(`[QuizDB] Seeded ${subCatCount} sub-categories`);

  // Seed countries
  console.log("[QuizDB] Seeding countries...");
  for (let i = 0; i < countries.length; i++) {
    const c = countries[i];
    await prisma.quizCountry.upsert({
      where: { code: c.code },
      update: { displayOrder: i + 1 },
      create: {
        name: c.name,
        code: c.code,
        displayOrder: i + 1,
      },
    });
  }
  console.log(`[QuizDB] Seeded ${countries.length} countries`);

  // Seed themes
  console.log("[QuizDB] Seeding themes...");
  for (let i = 0; i < themes.length; i++) {
    const t = themes[i];
    await prisma.quizTheme.upsert({
      where: { name: t.name },
      update: {
        monthsActive: t.months ? JSON.stringify(t.months) : null,
        displayOrder: i + 1,
      },
      create: {
        name: t.name,
        slug: slugify(t.name),
        monthsActive: t.months ? JSON.stringify(t.months) : null,
        displayOrder: i + 1,
      },
    });
  }
  console.log(`[QuizDB] Seeded ${themes.length} themes`);

  // Seed sources
  console.log("[QuizDB] Seeding sources...");
  for (let i = 0; i < sources.length; i++) {
    const s = sources[i];
    await prisma.quizSource.upsert({
      where: { slug: s.slug },
      update: { name: s.name, url: s.url, displayOrder: i + 1 },
      create: {
        name: s.name,
        slug: s.slug,
        url: s.url,
        displayOrder: i + 1,
      },
    });
  }
  console.log(`[QuizDB] Seeded ${sources.length} sources`);

  console.log("[QuizDB] Quiz database seed complete!");
}

seedQuizDatabase()
  .catch((error) => {
    console.error("[QuizDB] Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
