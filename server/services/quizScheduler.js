/**
 * Quiz Database Scheduler
 *
 * Runs periodic tasks for the quiz database:
 * - FBQ Blog scrape: daily at 06:00 UTC (checks for new blog posts with Q&A)
 *
 * The external Python scrapers (BBC, CNN, Guardian, NPR, NYT) are NOT run here.
 * They POST to /api/quiz-database/import when they complete. This scheduler
 * only handles the internal FBQ Blog scraper.
 *
 * To add more scheduled tasks, add cron.schedule() calls in initQuizScheduler().
 */

const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");

// ─── FBQ Blog Scraper (inline, same logic as scripts/scrapeFbqBlog.js) ──────

const CATEGORY_MAP = {
  "sports quiz": "Sports",
  "weekly news quiz": "News",
  "general knowledge quiz": "News",
  "football quiz": "Sports",
  "music quiz": "Music",
  "picture quiz": "Entertainment",
  "dingbats quiz": "Games",
  "flag quiz": "Geography",
};

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function extractQuestionsFromHtml(html) {
  const answerSplit = html.split(/<h[23][^>]*>[^<]*[Aa]nswers?[^<]*<\/h[23]>/);

  if (answerSplit.length < 2) {
    const altSplit = html.split(/<p><strong>[^<]*[Aa]nswers?[^<]*<\/strong><\/p>/);
    if (altSplit.length < 2) return [];
    answerSplit[0] = altSplit[0];
    answerSplit[1] = altSplit.slice(1).join("");
  }

  const questionSection = answerSplit[0];
  const answerSection = answerSplit.slice(1).join("");

  const questionRegex = /<p>[^<]*?(\d+)[\.\)]\s*([^<]+)<\/p>/g;
  const questions = {};
  let match;
  while ((match = questionRegex.exec(questionSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (text.length > 5) questions[num] = text;
  }

  const questionRegex2 = /<p><strong>(\d+)[\.\)]\s*<\/strong>\s*([^<]+)<\/p>/g;
  while ((match = questionRegex2.exec(questionSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (text.length > 5 && !questions[num]) questions[num] = text;
  }

  const answerRegex = /<p><strong>(\d+)[\.\)]\s*([^<]+)<\/strong><\/p>/g;
  const answers = {};
  while ((match = answerRegex.exec(answerSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    answers[num] = text;
  }

  const answerRegex2 = /<p>(\d+)[\.\)]\s*([^<]+)<\/p>/g;
  while ((match = answerRegex2.exec(answerSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (!answers[num] && text.length > 1) answers[num] = text;
  }

  const pairs = [];
  for (const num of Object.keys(questions).map(Number).sort((a, b) => a - b)) {
    if (answers[num]) {
      pairs.push({ question: questions[num], answer: answers[num] });
    }
  }
  return pairs;
}

function extractDateFromSlug(slug) {
  const dateMatch = slug.match(/(\d{2})-(\d{2})-(\d{4})$/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return null;
}

async function runBlogScrape() {
  const prisma = new PrismaClient();

  try {
    console.log("[QuizDB Scheduler] Starting FBQ Blog scrape...");

    const source = await prisma.quizSource.findUnique({ where: { slug: "fbq-blog" } });
    if (!source) {
      console.error("[QuizDB Scheduler] FBQ Blog source not found");
      return;
    }

    const generalTheme = await prisma.quizTheme.findUnique({ where: { name: "General" } });
    const worldCountry = await prisma.quizCountry.findUnique({ where: { code: "WORLD" } });

    const allCategories = await prisma.quizCategory.findMany();
    const categoryNameMap = {};
    for (const cat of allCategories) {
      categoryNameMap[cat.name.toLowerCase()] = cat.id;
    }

    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        createdAt: true,
        category: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    let totalImported = 0;
    let totalSkipped = 0;

    for (const post of posts) {
      const pairs = extractQuestionsFromHtml(post.content);
      if (pairs.length === 0) continue;

      const blogCategoryName = (post.category?.name || "").toLowerCase();
      const quizCategoryName = CATEGORY_MAP[blogCategoryName] || "News";
      const categoryId = categoryNameMap[quizCategoryName.toLowerCase()] || categoryNameMap["news"];
      const publishedDate = extractDateFromSlug(post.slug) || post.createdAt;
      const year = publishedDate ? publishedDate.getFullYear() : null;

      for (let i = 0; i < pairs.length; i++) {
        const { question, answer } = pairs[i];
        const externalId = `fbq-blog-${post.slug}-q${i + 1}`;

        const existing = await prisma.quizQuestion.findUnique({ where: { externalId } });
        if (existing) {
          totalSkipped++;
          continue;
        }

        try {
          await prisma.quizQuestion.create({
            data: {
              questionText: question,
              answerText: answer,
              difficulty: "MEDIUM",
              questionType: "OPEN_ANSWER",
              status: "UNVERIFIED",
              categoryId,
              countryId: worldCountry?.id,
              themeId: generalTheme?.id,
              sourceId: source.id,
              sourceUrl: `https://fatbigquiz.com/blog/${post.slug}`,
              publishedDate,
              year,
              scrapedDate: new Date(),
              externalId,
            },
          });
          totalImported++;
        } catch (err) {
          console.error(`[QuizDB Scheduler] Error importing from ${post.slug}: ${err.message}`);
        }
      }
    }

    // Update source
    await prisma.quizSource.update({
      where: { id: source.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "success",
        lastRunCount: totalImported,
      },
    });

    console.log(`[QuizDB Scheduler] Blog scrape complete: ${totalImported} imported, ${totalSkipped} skipped`);
  } catch (error) {
    console.error("[QuizDB Scheduler] Blog scrape failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── External scraper runner ───────────────────────────────────────────────

const { execFile } = require("child_process");
const path = require("path");

/**
 * Run the external Playwright-based scraper as a child process.
 * This avoids loading Playwright in the main Express process.
 */
function runExternalScraper(sourceFilter, maxPages = 20) {
  const scriptPath = path.join(__dirname, "../scripts/scrapeAllSources.js");
  const args = [`--source=${sourceFilter}`, `--max-pages=${maxPages}`];

  console.log(`[QuizDB Scheduler] Starting external scraper: ${sourceFilter}`);

  execFile("node", [scriptPath, ...args], { timeout: 600000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[QuizDB Scheduler] External scraper ${sourceFilter} failed:`, error.message);
    }
    if (stdout) {
      // Log just the summary lines
      const lines = stdout.split("\n");
      const summaryStart = lines.findIndex((l) => l.includes("RESULTS SUMMARY"));
      if (summaryStart >= 0) {
        lines.slice(summaryStart).forEach((l) => console.log(`[QuizDB Scheduler] ${l}`));
      } else {
        console.log(`[QuizDB Scheduler] ${sourceFilter} output: ${stdout.slice(-200)}`);
      }
    }
    if (stderr) {
      console.error(`[QuizDB Scheduler] ${sourceFilter} stderr: ${stderr.slice(-200)}`);
    }
  });
}

// ─── Initialise scheduler ───────────────────────────────────────────────────

function initQuizScheduler() {
  console.log("[QuizDB Scheduler] Initialising quiz database scheduler...");

  // FBQ Blog scrape: daily at 06:00 UTC
  cron.schedule("0 6 * * *", () => {
    console.log("[QuizDB Scheduler] Running scheduled FBQ Blog scrape...");
    runBlogScrape();
  });

  // Guardian News Quiz (Thursday Quiz): every Thursday at 12:00 UTC
  cron.schedule("0 12 * * 4", () => {
    runExternalScraper("guardian-news", 5);
  });

  // Guardian Sports Quiz: every Friday at 12:00 UTC
  cron.schedule("0 12 * * 5", () => {
    runExternalScraper("guardian-sports", 5);
  });

  // Guardian Kids Quiz: every Saturday at 08:00 UTC
  cron.schedule("0 8 * * 6", () => {
    runExternalScraper("guardian-kids", 3);
  });

  // Guardian Thomas Eaton (Saturday Quiz): every Saturday at 14:00 UTC
  cron.schedule("0 14 * * 6", () => {
    runExternalScraper("guardian-eaton", 3);
  });

  // Guardian Newsquiz: every Friday at 14:00 UTC
  cron.schedule("0 14 * * 5", () => {
    runExternalScraper("guardian-newsquiz", 3);
  });

  // Guardian Standalone (catch-all /tone/quizzes): every Sunday at 06:00 UTC
  cron.schedule("0 6 * * 0", () => {
    runExternalScraper("guardian-standalone", 5);
  });

  // NPR Weekly News Quiz: every Saturday at 10:00 UTC
  cron.schedule("0 10 * * 6", () => {
    runExternalScraper("npr", 3);
  });

  // CNN Quiz: every Monday at 08:00 UTC
  cron.schedule("0 8 * * 1", () => {
    runExternalScraper("cnn", 5);
  });

  // BBC Football Quiz: every Monday at 09:00 UTC
  cron.schedule("0 9 * * 1", () => {
    runExternalScraper("bbc-football", 10);
  });

  console.log("[QuizDB Scheduler] Scheduled:");
  console.log("  - FBQ Blog scrape: daily at 06:00 UTC");
  console.log("  - Guardian News Quiz: Thursdays at 12:00 UTC");
  console.log("  - Guardian Sports Quiz: Fridays at 12:00 UTC");
  console.log("  - Guardian Kids Quiz: Saturdays at 08:00 UTC");
  console.log("  - Guardian Thomas Eaton: Saturdays at 14:00 UTC");
  console.log("  - Guardian Newsquiz: Fridays at 14:00 UTC");
  console.log("  - Guardian Standalone: Sundays at 06:00 UTC");
  console.log("  - NPR Quiz: Saturdays at 10:00 UTC");
  console.log("  - CNN Quiz: Mondays at 08:00 UTC");
  console.log("  - BBC Football Quiz: Mondays at 09:00 UTC");
}

module.exports = { initQuizScheduler, runBlogScrape, runExternalScraper };
