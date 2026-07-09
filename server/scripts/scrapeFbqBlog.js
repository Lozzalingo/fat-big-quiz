#!/usr/bin/env node
/**
 * FBQ Blog Scraper - extracts quiz questions and answers from Fat Big Quiz blog posts
 * and imports them into the quiz database.
 *
 * Blog posts use this pattern:
 *   Questions: <p>1. Question text here</p>
 *   Answers:   <p><strong>1. Answer text</strong></p>
 *   Separated by an <h2>Answers</h2> header
 *
 * Usage: node server/scripts/scrapeFbqBlog.js
 *        node server/scripts/scrapeFbqBlog.js --dry-run
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Category mapping (blog category name -> quiz category name) ────────────

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

// ─── HTML parsing helpers ───────────────────────────────────────────────────

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

/**
 * Extract numbered questions and answers from blog post HTML
 * Returns array of { question, answer }
 */
function extractQuestionsFromHtml(html) {
  // Split content at "Answers" heading
  const answerSplit = html.split(/<h[23][^>]*>[^<]*[Aa]nswers?[^<]*<\/h[23]>/);

  if (answerSplit.length < 2) {
    // Try splitting at a bold "Answers" paragraph
    const altSplit = html.split(/<p><strong>[^<]*[Aa]nswers?[^<]*<\/strong><\/p>/);
    if (altSplit.length < 2) return [];
    answerSplit[0] = altSplit[0];
    answerSplit[1] = altSplit.slice(1).join("");
  }

  const questionSection = answerSplit[0];
  const answerSection = answerSplit.slice(1).join("");

  // Extract numbered questions: <p>1. question text</p> or <p><strong>1.</strong> question text</p>
  const questionRegex = /<p>[^<]*?(\d+)[\.\)]\s*([^<]+)<\/p>/g;
  const questions = {};
  let match;
  while ((match = questionRegex.exec(questionSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (text.length > 5) {
      questions[num] = text;
    }
  }

  // Also try questions inside strong tags
  const questionRegex2 = /<p><strong>(\d+)[\.\)]\s*<\/strong>\s*([^<]+)<\/p>/g;
  while ((match = questionRegex2.exec(questionSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (text.length > 5 && !questions[num]) {
      questions[num] = text;
    }
  }

  // Extract numbered answers: <p><strong>1. answer text</strong></p>
  const answerRegex = /<p><strong>(\d+)[\.\)]\s*([^<]+)<\/strong><\/p>/g;
  const answers = {};
  while ((match = answerRegex.exec(answerSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    answers[num] = text;
  }

  // Also try plain numbered answers
  const answerRegex2 = /<p>(\d+)[\.\)]\s*([^<]+)<\/p>/g;
  while ((match = answerRegex2.exec(answerSection)) !== null) {
    const num = parseInt(match[1]);
    const text = match[2].trim();
    if (!answers[num] && text.length > 1) {
      answers[num] = text;
    }
  }

  // Match questions to answers
  const pairs = [];
  for (const num of Object.keys(questions).map(Number).sort((a, b) => a - b)) {
    if (answers[num]) {
      pairs.push({
        question: questions[num],
        answer: answers[num],
      });
    }
  }

  return pairs;
}

/**
 * Extract date from blog post slug or createdAt
 * Slugs like: weekly-sports-quiz-questions-25-03-2024
 */
function extractDateFromSlug(slug) {
  // Try DD-MM-YYYY pattern at end of slug
  const dateMatch = slug.match(/(\d{2})-(\d{2})-(\d{4})$/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try YYYY-MM-DD pattern
  const isoMatch = slug.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(isoMatch[0]);
  }

  return null;
}

// ─── Main scrape function ───────────────────────────────────────────────────

async function scrapeFbqBlog(dryRun = false) {
  console.log(`[QuizDB BlogScrape] Starting FBQ blog scrape${dryRun ? " (dry run)" : ""}...`);

  // Get the FBQ Blog source
  const source = await prisma.quizSource.findUnique({ where: { slug: "fbq-blog" } });
  if (!source) {
    console.error("[QuizDB BlogScrape] FBQ Blog source not found in database");
    return;
  }

  // Get the General theme and World country as defaults
  const generalTheme = await prisma.quizTheme.findUnique({ where: { name: "General" } });
  const worldCountry = await prisma.quizCountry.findUnique({ where: { code: "WORLD" } });

  // Pre-load categories
  const allCategories = await prisma.quizCategory.findMany();
  const categoryNameMap = {};
  for (const cat of allCategories) {
    categoryNameMap[cat.name.toLowerCase()] = cat.id;
  }

  // Get all published blog posts
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

  console.log(`[QuizDB BlogScrape] Found ${posts.length} published blog posts`);

  let totalImported = 0;
  let totalSkipped = 0;
  let postsProcessed = 0;
  let postsWithQuestions = 0;

  for (const post of posts) {
    const pairs = extractQuestionsFromHtml(post.content);

    if (pairs.length === 0) continue;
    postsWithQuestions++;

    // Map blog category to quiz category
    const blogCategoryName = (post.category?.name || "").toLowerCase();
    const quizCategoryName = CATEGORY_MAP[blogCategoryName] || "News";
    const categoryId = categoryNameMap[quizCategoryName.toLowerCase()] || categoryNameMap["news"];

    // Get date from slug or createdAt
    const publishedDate = extractDateFromSlug(post.slug) || post.createdAt;
    const year = publishedDate ? publishedDate.getFullYear() : null;

    console.log(`[QuizDB BlogScrape] ${post.slug}: ${pairs.length} Q&A pairs found`);

    for (let i = 0; i < pairs.length; i++) {
      const { question, answer } = pairs[i];
      const externalId = `fbq-blog-${post.slug}-q${i + 1}`;

      // Check for duplicate
      const existing = await prisma.quizQuestion.findUnique({ where: { externalId } });
      if (existing) {
        totalSkipped++;
        continue;
      }

      if (!dryRun) {
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
          console.error(`[QuizDB BlogScrape] Error importing from ${post.slug}: ${err.message}`);
        }
      } else {
        console.log(`  [DRY RUN] Would import: Q: "${question.slice(0, 60)}..." A: "${answer}"`);
        totalImported++;
      }
    }
    postsProcessed++;
  }

  // Update source last run info
  if (!dryRun) {
    await prisma.quizSource.update({
      where: { id: source.id },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: "success",
        lastRunCount: totalImported,
      },
    });
  }

  console.log(`[QuizDB BlogScrape] Complete:`);
  console.log(`  Posts processed: ${postsProcessed}`);
  console.log(`  Posts with questions: ${postsWithQuestions}`);
  console.log(`  Questions imported: ${totalImported}`);
  console.log(`  Duplicates skipped: ${totalSkipped}`);

  return { totalImported, totalSkipped, postsWithQuestions };
}

// ─── CLI Entry ──────────────────────────────────────────────────────────────

const dryRun = process.argv.includes("--dry-run");

scrapeFbqBlog(dryRun)
  .catch((error) => {
    console.error("[QuizDB BlogScrape] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
