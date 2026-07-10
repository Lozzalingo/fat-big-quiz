#!/usr/bin/env node
/**
 * Scrape quiz questions from all external sources and import into the database.
 *
 * Usage:
 *   node server/scripts/scrapeAllSources.js                    # scrape all sources
 *   node server/scripts/scrapeAllSources.js --source=guardian   # scrape one source
 *   node server/scripts/scrapeAllSources.js --dry-run           # preview without importing
 *   node server/scripts/scrapeAllSources.js --max-pages=5       # limit pages to scrape per source
 *   node server/scripts/scrapeAllSources.js --history           # full archive mode
 *
 * Sources: guardian-news, guardian-sports, guardian-kids, guardian-eaton,
 *          guardian-newsquiz, guardian-christmas, guardian-standalone,
 *          guardian-all, cnn, npr, bbc-football, nyt
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const { chromium } = require("playwright");
const axios = require("axios");
const cheerio = require("cheerio");

const prisma = new PrismaClient();

// ─── Config ─────────────────────────────────────────────────────────────────

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let categoryMap = {};
let subCategoryMap = {};

async function loadLookups() {
  const cats = await prisma.quizCategory.findMany();
  categoryMap = {};
  for (const c of cats) categoryMap[c.name.toLowerCase()] = c.id;

  const subs = await prisma.quizSubCategory.findMany();
  subCategoryMap = {};
  for (const s of subs) subCategoryMap[s.name.toLowerCase()] = s.id;
}

function findCategoryId(name) {
  if (!name) return categoryMap["news"];
  return categoryMap[name.toLowerCase()] || categoryMap["news"];
}

function findSubCategoryId(name) {
  if (!name) return null;
  return subCategoryMap[name.toLowerCase()] || null;
}

async function importQuestion(data, sourceId, countryId, themeId, dryRun) {
  // Check duplicate
  if (data.externalId) {
    const existing = await prisma.quizQuestion.findUnique({
      where: { externalId: data.externalId },
    });
    if (existing) return "duplicate";
  } else {
    const existing = await prisma.quizQuestion.findFirst({
      where: { questionText: { equals: data.questionText }, sourceId },
    });
    if (existing) return "duplicate";
  }

  if (dryRun) {
    console.log(`  [DRY RUN] Q: "${data.questionText.slice(0, 70)}..." A: "${data.answerText}"`);
    return "imported";
  }

  await prisma.quizQuestion.create({
    data: {
      questionText: data.questionText,
      answerText: data.answerText,
      options: data.options ? JSON.stringify(data.options) : null,
      explanation: data.explanation || null,
      difficulty: "MEDIUM",
      questionType: data.options && data.options.length > 0 ? "MULTIPLE_CHOICE" : "OPEN_ANSWER",
      status: "UNVERIFIED",
      categoryId: data.categoryId || findCategoryId("News"),
      subCategoryId: data.subCategoryId || null,
      countryId,
      themeId,
      sourceId,
      sourceUrl: data.sourceUrl || null,
      publishedDate: data.publishedDate || null,
      year: data.publishedDate ? new Date(data.publishedDate).getFullYear() : null,
      scrapedDate: new Date(),
      externalId: data.externalId || null,
    },
  });
  return "imported";
}

/**
 * Retry-aware HTTP GET. Respects 429 rate limits with exponential backoff.
 */
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await axios.get(url, { headers: HEADERS, ...options });
      return res;
    } catch (err) {
      if (err.response && err.response.status === 429) {
        const waitTime = Math.pow(2, attempt) * 2000;
        console.log(`[Scraper] Rate limited (429) on ${url}, waiting ${waitTime / 1000}s before retry ${attempt}/${maxRetries}`);
        await sleep(waitTime);
        continue;
      }
      if (attempt === maxRetries) throw err;
      console.log(`[Scraper] Request failed for ${url} (attempt ${attempt}/${maxRetries}): ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

// ─── Guardian shared helper ────────────────────────────────────────────────

/**
 * Scrape a single Guardian quiz page.
 * Guardian quizzes use fieldsets with legends for questions, radio inputs
 * for options, and per-question "Reveal" buttons. After clicking reveal,
 * the correct answer is marked with data-answer-type containing "correct".
 * The answer label has two spans: first = answer text, second = explanation.
 *
 * For older quizzes (pre-2020, e.g. Thomas Eaton), falls back to text-based
 * Q&A extraction if no fieldsets are found.
 */
async function scrapeGuardianPage(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await sleep(3000);

  // Dismiss cookie consent
  try {
    await page.evaluate(() => {
      const btn = document.querySelector('[data-link-name="accept"]');
      if (btn) btn.click();
    });
    await sleep(500);
  } catch (err) {
    console.error(`[Scraper] Cookie dismiss failed on ${url}: ${err.message}`);
  }

  // Get published date
  const dateStr = await page
    .$eval('meta[property="article:published_time"]', (el) => el.content)
    .catch(() => null);
  const publishedDate = dateStr ? new Date(dateStr) : null;

  // Use page.evaluate to click radios, reveal, and extract Q&A all in-page
  const qaData = await page.evaluate(async () => {
    function sl(ms) {
      return new Promise((r) => setTimeout(r, ms));
    }

    const outerFieldsets = document.querySelectorAll("fieldset:has(legend)");

    // Modern format: fieldsets with legends and reveal buttons
    if (outerFieldsets.length > 0) {
      const results = [];

      for (const fs of outerFieldsets) {
        const legend = fs.querySelector("legend");
        if (!legend) continue;
        const qText = legend.textContent.trim().replace(/^\d+\.?\s*/, "");
        if (qText.length < 10) continue;

        // Get option labels (before reveal, from the inner fieldset labels)
        const labels = Array.from(fs.querySelectorAll("label")).map((l) => {
          const firstSpan = l.querySelector("span");
          return firstSpan ? firstSpan.textContent.trim() : l.textContent.trim();
        });

        // Click first radio to enable reveal
        const firstRadio = fs.querySelector('input[type="radio"]');
        if (firstRadio) firstRadio.click();
        await sl(200);

        // Click the Reveal button for this question
        const revealBtn = fs.querySelector("button");
        if (revealBtn) revealBtn.click();
        await sl(500);

        // Find the correct answer (can be correct-selected-answer or non-selected-correct-answer)
        const correctEl = fs.querySelector(
          '[data-answer-type="correct-selected-answer"], [data-answer-type="non-selected-correct-answer"]'
        );
        let answer = "";
        let explanation = "";
        if (correctEl) {
          const spans = correctEl.querySelectorAll("span");
          if (spans.length >= 1) {
            answer = spans[0].textContent.trim();
          }
          if (spans.length >= 2) {
            explanation = spans[1].textContent.trim();
          }
          if (!answer) {
            answer = correctEl.textContent.trim();
          }
        }

        results.push({
          question: qText,
          answer,
          explanation,
          options: labels.filter((l) => l.length > 0),
        });
      }
      return results;
    }

    // Fallback for older quizzes (pre-2020): text-based Q&A extraction
    // Look for numbered questions in the article body
    const articleBody = document.querySelector('[data-gu-name="body"], .article-body-commercial-selector, .content__article-body');
    if (!articleBody) return [];

    const bodyText = articleBody.innerText;
    const results = [];

    // Pattern 1: Numbered questions like "1. What is...?" or "1) What is...?"
    const numberedPattern = /(?:^|\n)\s*(\d+)[.)]\s*(.+?\?)/g;
    const questions = [];
    let match;
    while ((match = numberedPattern.exec(bodyText)) !== null) {
      questions.push({ num: parseInt(match[1]), text: match[2].trim() });
    }

    if (questions.length > 0) {
      // Try to find answers section - often after "Answers" heading
      const answersMatch = bodyText.match(/(?:Answers|ANSWERS|answers)\s*[:\n](.+)/s);
      if (answersMatch) {
        const answersText = answersMatch[1];
        const answerPattern = /(?:^|\n)\s*(\d+)[.)]\s*(.+?)(?=\n\s*\d+[.)]|\n*$)/g;
        const answers = {};
        let aMatch;
        while ((aMatch = answerPattern.exec(answersText)) !== null) {
          answers[parseInt(aMatch[1])] = aMatch[2].trim();
        }

        for (const q of questions) {
          if (answers[q.num]) {
            results.push({
              question: q.text,
              answer: answers[q.num],
              explanation: "",
              options: [],
            });
          }
        }
      }
    }

    // Pattern 2: Bold question text followed by answer
    if (results.length === 0) {
      const strongEls = articleBody.querySelectorAll("strong, b");
      for (const strong of strongEls) {
        const text = strong.textContent.trim();
        if (text.includes("?") && text.length > 15) {
          // Next sibling or parent's next sibling might contain the answer
          const parent = strong.closest("p");
          if (parent && parent.nextElementSibling) {
            const answerText = parent.nextElementSibling.textContent.trim();
            if (answerText.length > 0 && answerText.length < 500) {
              results.push({
                question: text.replace(/^\d+[.)]\s*/, ""),
                answer: answerText,
                explanation: "",
                options: [],
              });
            }
          }
        }
      }
    }

    return results;
  });

  return { qaData, publishedDate };
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN SERIES URL FETCHER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get quiz article URLs from a Guardian series page.
 * Paginates through ALL index pages to collect every quiz URL,
 * then returns up to maxPages quiz URLs for processing.
 *
 * @param {string} seriesUrl - The series index URL
 * @param {string} pathSegment - URL path segment for filtering (e.g. "/lifeandstyle/")
 * @param {number} maxPages - Maximum number of quiz URLs to return for processing
 * @param {object} [options] - Additional options
 * @param {boolean} [options.requireQuizInUrl] - Whether to require "quiz" in the URL (default true)
 */
async function getGuardianSeriesUrls(seriesUrl, pathSegment, maxPages, options = {}) {
  const requireQuizInUrl = options.requireQuizInUrl !== false;
  const allUrls = [];
  let pageNum = 1;

  while (true) {
    try {
      const pageUrl = pageNum === 1 ? seriesUrl : `${seriesUrl}?page=${pageNum}`;
      const res = await fetchWithRetry(pageUrl);
      const $ = cheerio.load(res.data);
      let foundOnPage = 0;

      $(`a[href*="${pathSegment}"]`).each((_, el) => {
        const href = $(el).attr("href");
        if (
          href &&
          (!requireQuizInUrl || href.includes("quiz")) &&
          href.match(/\/\d{4}\//) &&
          !href.includes("#") &&
          !href.endsWith("/all")
        ) {
          const fullUrl = href.startsWith("http") ? href : `https://www.theguardian.com${href}`;
          if (!allUrls.includes(fullUrl)) {
            allUrls.push(fullUrl);
            foundOnPage++;
          }
        }
      });

      console.log(`[Scraper]   Series page ${pageNum}: found ${foundOnPage} new URLs (total: ${allUrls.length})`);

      if (foundOnPage === 0) {
        console.log(`[Scraper]   No new URLs on page ${pageNum}, finished paginating`);
        break;
      }

      pageNum++;
      await sleep(500);
    } catch (err) {
      console.error(`[Scraper]   Error fetching series page ${pageNum}: ${err.message}`);
      break;
    }
  }

  console.log(`[Scraper]   Collected ${allUrls.length} total URLs, returning up to ${maxPages} for processing`);
  return allUrls.slice(0, maxPages);
}

/**
 * Get quiz URLs from the Guardian /tone/quizzes catch-all page.
 * This page lists quizzes from all sections, so we use a broader URL filter.
 */
async function getGuardianStandaloneUrls(maxPages) {
  const baseUrl = "https://www.theguardian.com/tone/quizzes";
  const allUrls = [];
  let pageNum = 1;

  while (true) {
    try {
      const pageUrl = pageNum === 1 ? baseUrl : `${baseUrl}?page=${pageNum}`;
      const res = await fetchWithRetry(pageUrl);
      const $ = cheerio.load(res.data);
      let foundOnPage = 0;

      $("a[href*='theguardian.com']").each((_, el) => {
        const href = $(el).attr("href");
        if (
          href &&
          href.match(/\/\d{4}\//) &&
          !href.includes("#") &&
          !href.endsWith("/all") &&
          !href.includes("/tone/") &&
          !href.includes("/series/")
        ) {
          const fullUrl = href.startsWith("http") ? href : `https://www.theguardian.com${href}`;
          if (!allUrls.includes(fullUrl)) {
            allUrls.push(fullUrl);
            foundOnPage++;
          }
        }
      });

      // Also pick up relative links
      $("a[href^='/']").each((_, el) => {
        const href = $(el).attr("href");
        if (
          href &&
          href.match(/\/\d{4}\//) &&
          !href.includes("#") &&
          !href.endsWith("/all") &&
          !href.includes("/tone/") &&
          !href.includes("/series/")
        ) {
          const fullUrl = `https://www.theguardian.com${href}`;
          if (!allUrls.includes(fullUrl)) {
            allUrls.push(fullUrl);
            foundOnPage++;
          }
        }
      });

      console.log(`[Scraper]   Standalone page ${pageNum}: found ${foundOnPage} new URLs (total: ${allUrls.length})`);

      if (foundOnPage === 0) {
        console.log(`[Scraper]   No new URLs on page ${pageNum}, finished paginating`);
        break;
      }

      pageNum++;
      await sleep(500);
    } catch (err) {
      console.error(`[Scraper]   Error fetching standalone page ${pageNum}: ${err.message}`);
      break;
    }
  }

  console.log(`[Scraper]   Collected ${allUrls.length} total standalone URLs, returning up to ${maxPages} for processing`);
  return allUrls.slice(0, maxPages);
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN SHARED SCRAPER LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic Guardian series scraper. All Guardian scrapers funnel through here.
 *
 * @param {object} browser - Playwright browser context
 * @param {number} maxPages - Max quiz pages to process
 * @param {boolean} dryRun - Preview mode
 * @param {object} config - Source-specific configuration
 * @param {string} config.sourceSlug - Database source slug
 * @param {string} config.sourceName - Human-readable source name
 * @param {string} config.seriesUrl - Series index URL
 * @param {string} config.pathSegment - URL path segment for filtering
 * @param {string} config.externalIdPrefix - Prefix for external IDs
 * @param {string} config.categoryName - Default category name
 * @param {string} [config.subCategoryName] - Optional sub-category name
 * @param {string} [config.themeName] - Theme name (default "General")
 * @param {string} [config.countryCode] - Country code (default "UK")
 * @param {function} [config.getCategoryForUrl] - Optional function to derive category from URL
 * @param {function} [config.getUrlsFn] - Optional custom URL fetching function
 * @param {boolean} [config.requireQuizInUrl] - Whether to require "quiz" in URL (default true)
 * @param {Set} [config.excludeUrls] - URLs to skip (for deduplication)
 */
async function scrapeGuardianSeries(browser, maxPages, dryRun, config) {
  console.log(`[Scraper] Starting ${config.sourceName}...`);

  const source = await prisma.quizSource.findUnique({ where: { slug: config.sourceSlug } });
  if (!source) {
    console.error(`[Scraper] Source not found in database: ${config.sourceSlug}. Run seedQuizDatabase.js first.`);
    return { source: config.sourceName, imported: 0, skipped: 0 };
  }

  const country = await prisma.quizCountry.findUnique({ where: { code: config.countryCode || "UK" } });
  const themeName = config.themeName || "General";
  const theme = await prisma.quizTheme.findUnique({ where: { name: themeName } });

  // Fetch quiz URLs
  let quizUrls;
  if (config.getUrlsFn) {
    quizUrls = await config.getUrlsFn(maxPages);
  } else {
    quizUrls = await getGuardianSeriesUrls(
      config.seriesUrl,
      config.pathSegment,
      maxPages,
      { requireQuizInUrl: config.requireQuizInUrl }
    );
  }

  // Deduplicate against excluded URLs
  if (config.excludeUrls && config.excludeUrls.size > 0) {
    const before = quizUrls.length;
    quizUrls = quizUrls.filter((url) => !config.excludeUrls.has(url));
    if (before !== quizUrls.length) {
      console.log(`[Scraper]   Deduplicated: removed ${before - quizUrls.length} URLs already scraped by other sources`);
    }
  }

  console.log(`[Scraper] Found ${quizUrls.length} ${config.sourceName} quiz URLs`);

  let imported = 0;
  let skipped = 0;

  for (const url of quizUrls) {
    console.log(`[Scraper] Scraping: ${url}`);
    try {
      const page = await browser.newPage();
      const { qaData, publishedDate } = await scrapeGuardianPage(page, url);
      console.log(`[Scraper]   Extracted ${qaData.length} Q&A from page`);

      // Determine category for this URL
      let categoryName = config.categoryName;
      let subCategoryName = config.subCategoryName || null;
      if (config.getCategoryForUrl) {
        const detected = config.getCategoryForUrl(url);
        categoryName = detected.category || categoryName;
        subCategoryName = detected.subCategory || subCategoryName;
      }

      for (let i = 0; i < qaData.length; i++) {
        const qa = qaData[i];
        if (!qa.answer) continue;

        const opts = qa.options.map((text, idx) => ({
          label: String.fromCharCode(65 + idx),
          text,
        }));

        const slug = url.split("/").pop() || "unknown";
        const externalId = `${config.externalIdPrefix}-${slug}-q${i + 1}`;

        const result = await importQuestion(
          {
            questionText: qa.question,
            answerText: qa.answer,
            explanation: qa.explanation || null,
            options: opts.length > 0 ? opts : null,
            categoryId: findCategoryId(categoryName),
            subCategoryId: findSubCategoryId(subCategoryName),
            sourceUrl: url,
            publishedDate,
            externalId,
          },
          source.id,
          country.id,
          theme ? theme.id : null,
          dryRun
        );
        if (result === "imported") imported++;
        else skipped++;
      }

      await page.close();
      await sleep(1000);
    } catch (err) {
      console.error(`[Scraper] Error scraping ${url}: ${err.message}`);
    }
  }

  return { source: config.sourceName, imported, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN NEWS QUIZ (Thursday Quiz)
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeGuardianNews(browser, maxPages, dryRun) {
  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-news-quiz",
    sourceName: "Guardian News",
    seriesUrl: "https://www.theguardian.com/lifeandstyle/series/thursday-quiz",
    pathSegment: "/lifeandstyle/",
    externalIdPrefix: "guardian-news",
    categoryName: "News",
    themeName: "General",
    countryCode: "UK",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN SPORTS QUIZ
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeGuardianSports(browser, maxPages, dryRun) {
  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-sports-quiz",
    sourceName: "Guardian Sports",
    seriesUrl: "https://www.theguardian.com/sport/series/sports-quiz-of-the-week",
    pathSegment: "/sport/",
    externalIdPrefix: "guardian-sports",
    categoryName: "Sports",
    themeName: "General",
    countryCode: "UK",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN KIDS QUIZ
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeGuardianKids(browser, maxPages, dryRun) {
  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-kids-quiz",
    sourceName: "Guardian Kids Quiz",
    seriesUrl: "https://www.theguardian.com/lifeandstyle/series/the-kids--quiz",
    pathSegment: "/lifeandstyle/",
    externalIdPrefix: "guardian-kids",
    categoryName: "Entertainment",
    themeName: "General",
    countryCode: "UK",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN THOMAS EATON QUIZ
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeGuardianEaton(browser, maxPages, dryRun) {
  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-thomas-eaton",
    sourceName: "Guardian Thomas Eaton",
    seriesUrl: "https://www.theguardian.com/theguardian/series/the-quiz-thomas-eaton",
    pathSegment: "/theguardian/",
    externalIdPrefix: "guardian-eaton",
    categoryName: "Entertainment",
    themeName: "General",
    countryCode: "UK",
    requireQuizInUrl: false, // older articles may not have "quiz" in the URL
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN NEWSQUIZ
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeGuardianNewsquiz(browser, maxPages, dryRun) {
  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-newsquiz",
    sourceName: "Guardian Newsquiz",
    seriesUrl: "https://www.theguardian.com/news/series/newsquiz",
    pathSegment: "/news/",
    externalIdPrefix: "guardian-newsquiz",
    categoryName: "News",
    themeName: "General",
    countryCode: "UK",
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN CHRISTMAS PUZZLES
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeGuardianChristmas(browser, maxPages, dryRun) {
  // Christmas puzzles span multiple year-specific series URLs
  const seriesUrls = [
    "https://www.theguardian.com/lifeandstyle/series/christmas-puzzles-special-2025",
    "https://www.theguardian.com/lifeandstyle/series/christmas-puzzles-special-2024",
    "https://www.theguardian.com/lifeandstyle/series/christmas-puzzles-special-2023",
  ];

  // Collect URLs from all year-specific series pages
  const getChristmasUrls = async (maxQuizPages) => {
    const allUrls = [];

    for (const seriesUrl of seriesUrls) {
      console.log(`[Scraper]   Checking Christmas series: ${seriesUrl}`);
      try {
        const urls = await getGuardianSeriesUrls(seriesUrl, "/lifeandstyle/", 9999, { requireQuizInUrl: false });
        for (const url of urls) {
          if (!allUrls.includes(url)) {
            allUrls.push(url);
          }
        }
      } catch (err) {
        console.log(`[Scraper]   Christmas series not found or error: ${seriesUrl} - ${err.message}`);
      }
    }

    console.log(`[Scraper]   Collected ${allUrls.length} Christmas URLs across all years`);
    return allUrls.slice(0, maxQuizPages);
  };

  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-christmas",
    sourceName: "Guardian Christmas",
    seriesUrl: seriesUrls[0],
    pathSegment: "/lifeandstyle/",
    externalIdPrefix: "guardian-christmas",
    categoryName: "Entertainment",
    themeName: "Christmas",
    countryCode: "UK",
    requireQuizInUrl: false,
    getUrlsFn: getChristmasUrls,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GUARDIAN STANDALONE QUIZZES (from /tone/quizzes)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect category from a Guardian URL path.
 */
function detectGuardianCategory(url) {
  if (url.includes("/football/")) return { category: "Sports", subCategory: "Football" };
  if (url.includes("/sport/")) return { category: "Sports", subCategory: null };
  if (url.includes("/tv-and-radio/")) return { category: "Entertainment", subCategory: null };
  if (url.includes("/business/")) return { category: "Business and Finance", subCategory: null };
  if (url.includes("/society/")) return { category: "News", subCategory: null };
  if (url.includes("/music/")) return { category: "Music", subCategory: null };
  if (url.includes("/science/")) return { category: "Science", subCategory: null };
  if (url.includes("/food/")) return { category: "Food and Drink", subCategory: null };
  if (url.includes("/film/")) return { category: "Entertainment", subCategory: "Movies" };
  if (url.includes("/books/")) return { category: "Arts & Literature", subCategory: "Books" };
  if (url.includes("/politics/")) return { category: "Politics", subCategory: null };
  if (url.includes("/technology/")) return { category: "Technology", subCategory: null };
  if (url.includes("/travel/")) return { category: "Travel and Transportation", subCategory: null };
  if (url.includes("/environment/")) return { category: "Climate", subCategory: null };
  return { category: "Entertainment", subCategory: null };
}

async function scrapeGuardianStandalone(browser, maxPages, dryRun, excludeUrls) {
  return scrapeGuardianSeries(browser, maxPages, dryRun, {
    sourceSlug: "guardian-standalone",
    sourceName: "Guardian Standalone",
    seriesUrl: "https://www.theguardian.com/tone/quizzes",
    pathSegment: "/",
    externalIdPrefix: "guardian-standalone",
    categoryName: "Entertainment",
    themeName: "General",
    countryCode: "UK",
    requireQuizInUrl: false,
    getCategoryForUrl: detectGuardianCategory,
    getUrlsFn: (max) => getGuardianStandaloneUrls(max),
    excludeUrls: excludeUrls || new Set(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// COLLECT ALL GUARDIAN URLs (for deduplication)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Collect all URLs from known Guardian series (for deduplication against standalone).
 */
async function collectAllGuardianSeriesUrls() {
  console.log("[Scraper] Collecting all known Guardian series URLs for deduplication...");
  const allUrls = new Set();

  const series = [
    { url: "https://www.theguardian.com/lifeandstyle/series/thursday-quiz", path: "/lifeandstyle/" },
    { url: "https://www.theguardian.com/sport/series/sports-quiz-of-the-week", path: "/sport/" },
    { url: "https://www.theguardian.com/lifeandstyle/series/the-kids--quiz", path: "/lifeandstyle/" },
    { url: "https://www.theguardian.com/theguardian/series/the-quiz-thomas-eaton", path: "/theguardian/" },
    { url: "https://www.theguardian.com/news/series/newsquiz", path: "/news/" },
  ];

  for (const s of series) {
    try {
      const urls = await getGuardianSeriesUrls(s.url, s.path, 9999, { requireQuizInUrl: false });
      for (const u of urls) allUrls.add(u);
    } catch (err) {
      console.error(`[Scraper] Error collecting URLs from ${s.url}: ${err.message}`);
    }
  }

  console.log(`[Scraper] Collected ${allUrls.size} known Guardian series URLs for deduplication`);
  return allUrls;
}

// ═══════════════════════════════════════════════════════════════════════════
// CNN QUIZ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get CNN quiz archive URLs using the Wayback Machine CDX API,
 * with a fallback to constructing URLs from known date patterns.
 */
async function getCnnArchiveUrls(maxPages) {
  console.log("[Scraper] Fetching CNN archive URLs from Wayback Machine...");
  const allUrls = [];

  // Try Wayback Machine CDX API first
  try {
    const cdxUrl = "https://web.archive.org/cdx/search/cdx?url=edition.cnn.com/interactive/*/us/cnn-5-things-news-quiz*&output=json&fl=original&collapse=urlkey";
    const res = await fetchWithRetry(cdxUrl, { timeout: 30000 });

    if (res.data && Array.isArray(res.data)) {
      // First row is headers, skip it
      for (let i = 1; i < res.data.length; i++) {
        const originalUrl = res.data[i][0];
        if (originalUrl && !allUrls.includes(originalUrl)) {
          allUrls.push(originalUrl);
        }
      }
      console.log(`[Scraper] Wayback Machine returned ${allUrls.length} CNN quiz URLs`);
    }
  } catch (err) {
    console.error(`[Scraper] Wayback Machine CDX API failed: ${err.message}`);
  }

  // Fallback: construct URLs from January 2018 to present
  if (allUrls.length < 50) {
    console.log("[Scraper] Falling back to constructed CNN URLs...");

    const monthNames = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];

    const now = new Date();
    const startDate = new Date(2018, 0, 1);

    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 7)) {
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, "0");
      const monthName = monthNames[d.getMonth()];
      const day = d.getDate();

      const constructedUrl = `https://edition.cnn.com/interactive/${year}/${monthNum}/us/cnn-5-things-news-quiz-${monthName}-${day}-sec/`;
      if (!allUrls.includes(constructedUrl)) {
        allUrls.push(constructedUrl);
      }
    }

    console.log(`[Scraper] Generated ${allUrls.length} total CNN URLs (including constructed fallbacks)`);
  }

  // Deduplicate
  const unique = [...new Set(allUrls)];
  console.log(`[Scraper] Returning ${Math.min(unique.length, maxPages)} of ${unique.length} CNN URLs`);
  return unique.slice(0, maxPages);
}

async function scrapeCnn(browser, maxPages, dryRun) {
  console.log("[Scraper] Starting CNN Quiz...");

  const source = await prisma.quizSource.findUnique({ where: { slug: "cnn-quiz" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "US" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  let imported = 0;
  let skipped = 0;

  // Collect quiz URLs from multiple methods
  const quizUrls = [];

  // Method 1: Try the direct 5 Things Quiz shortlink
  try {
    const page = await browser.newPage();
    await page.goto("https://cnn.it/5thingsquiz", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000);
    const currentUrl = page.url();
    if (!currentUrl.includes("error") && !currentUrl.includes("404")) {
      quizUrls.push(currentUrl);
    }
    await page.close();
  } catch (err) {
    console.error(`[Scraper] CNN: Could not find quiz link: ${err.message}`);
  }

  // Method 2: Search for quiz articles
  try {
    const searchPage = await browser.newPage();
    await searchPage.goto("https://edition.cnn.com/search?q=weekly+news+quiz&size=10&sort=newest", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000);

    const searchLinks = await searchPage.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="quiz"]'))
        .map((a) => a.href)
        .filter((href) => href.includes("interactive") || href.includes("quiz"))
        .filter((href) => !href.includes("search"));
    });
    for (const link of searchLinks) {
      if (!quizUrls.includes(link)) quizUrls.push(link);
    }
    await searchPage.close();
  } catch (err) {
    console.error(`[Scraper] CNN search failed: ${err.message}`);
  }

  // Method 3: Deep archive via Wayback Machine / constructed URLs
  try {
    const archiveUrls = await getCnnArchiveUrls(maxPages);
    for (const url of archiveUrls) {
      if (!quizUrls.includes(url)) quizUrls.push(url);
    }
  } catch (err) {
    console.error(`[Scraper] CNN archive URL collection failed: ${err.message}`);
  }

  console.log(`[Scraper] Found ${quizUrls.length} CNN quiz URLs`);

  for (const url of quizUrls.slice(0, maxPages)) {
    console.log(`[Scraper] Scraping CNN: ${url}`);
    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      await sleep(3000);

      // Extract questions by clicking each option and finding correct answer via class changes
      const qaData = await page.evaluate(async () => {
        function sl(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        const results = [];
        const questionBlocks = document.querySelectorAll(".questionBlock, .quiz--question");

        for (const block of questionBlocks) {
          const qContent = block.querySelector(".quiz--question__content");
          const qText = qContent ? qContent.textContent.trim() : "";
          if (qText.length < 10) continue;

          const optionEls = Array.from(block.querySelectorAll(".questionOption, ._question-block_option"));
          const options = optionEls.map((o) => o.textContent.trim());

          // Click the first option to reveal correct answer
          if (optionEls[0]) optionEls[0].click();
          await sl(300);

          // After clicking, the correct option gets an additional class starting with "the-"
          let correctAnswer = "";
          let explanation = "";
          for (const opt of optionEls) {
            const classes = Array.from(opt.classList);
            if (classes.some((c) => c.startsWith("the-"))) {
              correctAnswer = opt.textContent.trim();
            }
          }

          // Get explanation from answer response
          const responseEl = block.querySelector("._question-block_answer-response__copy, .answerResponse");
          if (responseEl) {
            explanation = responseEl.textContent.trim();
          }

          if (correctAnswer) {
            results.push({
              question: qText,
              answer: correctAnswer,
              explanation,
              options,
            });
          }
        }
        return results;
      });

      console.log(`[Scraper] CNN extracted ${qaData.length} Q&A pairs from ${url}`);

      // Extract date from URL if possible
      const dateMatch = url.match(/\/(\d{4})\/(\d{2})\//);
      const publishedDate = dateMatch
        ? new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, 1)
        : new Date();

      for (let i = 0; i < qaData.length; i++) {
        const qa = qaData[i];
        const opts = qa.options.map((text, idx) => ({
          label: String.fromCharCode(65 + idx),
          text,
        }));

        const slug = url.split("/").pop() || "cnn";
        const externalId = `cnn-quiz-${slug}-q${i + 1}`;

        const result = await importQuestion(
          {
            questionText: qa.question,
            answerText: qa.answer,
            explanation: qa.explanation || null,
            options: opts,
            categoryId: findCategoryId("News"),
            sourceUrl: url,
            publishedDate,
            externalId,
          },
          source.id,
          country.id,
          theme.id,
          dryRun
        );
        if (result === "imported") imported++;
        else skipped++;
      }

      await page.close();
      await sleep(1000);
    } catch (err) {
      console.error(`[Scraper] CNN error for ${url}: ${err.message}`);
    }
  }

  return { source: "CNN Quiz", imported, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// NPR QUIZ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get NPR quiz URLs from archive pages (month-by-month pagination via ?date=M-DD-YYYY).
 * For CRON, only fetches recent months. For history, fetches all.
 */
async function getNprQuizUrls(maxPages) {
  const allUrls = [];
  const seen = new Set();

  try {
    // Fetch archive index to get month links
    const archiveRes = await fetchWithRetry("https://www.npr.org/series/1146192567/weekly-news-quiz/archive");
    const $archive = cheerio.load(archiveRes.data);
    const monthPaths = [];
    $archive('a[href*="archive?date="]').each((_, el) => {
      const href = $archive(el).attr("href");
      if (href && !monthPaths.includes(href)) monthPaths.push(href);
    });

    // Sort by date descending (most recent first) and limit to recent months for CRON
    monthPaths.sort((a, b) => {
      const dateA = a.split("date=")[1] || "";
      const dateB = b.split("date=")[1] || "";
      return dateB.localeCompare(dateA);
    });
    const monthsToFetch = monthPaths.slice(0, Math.max(3, maxPages));

    for (const path of monthsToFetch) {
      try {
        const res = await fetchWithRetry(`https://www.npr.org${path}`);
        const $ = cheerio.load(res.data);
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (
            href &&
            href.match(/npr\.org\/\d{4}\/\d{2}\/\d{2}\//) &&
            !href.includes("/archive") &&
            !href.includes("/series/") &&
            !seen.has(href)
          ) {
            seen.add(href);
            allUrls.push(href);
          }
        });
        await sleep(500);
      } catch (err) {
        console.error(`[Scraper]   Error fetching NPR archive ${path}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[Scraper]   Error fetching NPR archive index: ${err.message}`);
  }

  console.log(`[Scraper] Collected ${allUrls.length} NPR URLs from archive, returning up to ${maxPages}`);
  return allUrls.slice(0, maxPages);
}

async function scrapeNpr(browser, maxPages, dryRun) {
  console.log("[Scraper] Starting NPR Quiz...");

  const source = await prisma.quizSource.findUnique({ where: { slug: "npr-quiz" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "US" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  // Get quiz URLs with pagination
  const uniqueUrls = await getNprQuizUrls(maxPages);
  console.log(`[Scraper] Found ${uniqueUrls.length} NPR quiz URLs`);

  let imported = 0;
  let skipped = 0;

  for (const url of uniqueUrls) {
    console.log(`[Scraper] Scraping: ${url}`);
    try {
      // First get the Flourish embed URL from the article page
      const articleRes = await fetchWithRetry(url);
      const flourishMatch = articleRes.data.match(/flo\.uri\.sh\/visualisation\/(\d+)\/embed/);
      if (!flourishMatch) {
        console.log(`[Scraper] No Flourish embed found in ${url}`);
        continue;
      }

      const flourishUrl = `https://flo.uri.sh/visualisation/${flourishMatch[1]}/embed`;

      // Extract date from URL
      const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      const publishedDate = dateMatch
        ? new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]))
        : new Date();

      // Load Flourish embed in browser
      const page = await browser.newPage();
      await page.goto(flourishUrl, { waitUntil: "networkidle", timeout: 30000 });
      await sleep(2000);

      // Extract questions and answers from Flourish quiz
      const qaData = await page.evaluate(() => {
        const results = [];
        const questionContainers = document.querySelectorAll(".question-container, [class*='question']");

        if (questionContainers.length > 0) {
          const answerContainers = document.querySelectorAll(".answer-container, [class*='answer-container']");

          for (let i = 0; i < questionContainers.length; i++) {
            const qEl = questionContainers[i].querySelector(".question, [class*='question']");
            if (!qEl) continue;
            const qText = qEl.textContent.trim();
            if (qText.length < 10) continue;

            const answerContainer = answerContainers[i];
            if (!answerContainer) continue;

            const correctEl = answerContainer.querySelector(".answer-correct, [class*='correct']");
            const wrongEls = answerContainer.querySelectorAll(".answer-wrong, [class*='wrong']");

            const answer = correctEl ? correctEl.textContent.trim() : "";
            const options = [];
            if (correctEl) options.push({ text: correctEl.textContent.trim(), correct: true });
            wrongEls.forEach((el) => options.push({ text: el.textContent.trim(), correct: false }));

            if (answer) {
              results.push({
                question: qText,
                answer,
                options: options.map((o) => o.text),
              });
            }
          }
        }

        // Fallback: try to find structured text
        if (results.length === 0) {
          const allText = document.body.innerText;
          const lines = allText.split("\n").filter((l) => l.trim().length > 0);
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("?") && lines[i].length > 20) {
              results.push({
                question: lines[i].trim(),
                answer: lines[i + 1] ? lines[i + 1].trim() : "",
                options: [],
              });
            }
          }
        }

        return results;
      });

      console.log(`[Scraper] NPR: extracted ${qaData.length} Q&A from Flourish embed`);

      for (let i = 0; i < qaData.length; i++) {
        const qa = qaData[i];
        if (!qa.answer) continue;

        const opts =
          qa.options.length > 0
            ? qa.options.map((text, idx) => ({
                label: String.fromCharCode(65 + idx),
                text,
              }))
            : null;

        const externalId = `npr-${flourishMatch[1]}-q${i + 1}`;

        const result = await importQuestion(
          {
            questionText: qa.question,
            answerText: qa.answer,
            options: opts,
            categoryId: findCategoryId("News"),
            sourceUrl: url,
            publishedDate,
            externalId,
          },
          source.id,
          country.id,
          theme.id,
          dryRun
        );
        if (result === "imported") imported++;
        else skipped++;
      }

      await page.close();
      await sleep(1000);
    } catch (err) {
      console.error(`[Scraper] NPR error for ${url}: ${err.message}`);
    }
  }

  return { source: "NPR Quiz", imported, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// BBC FOOTBALL QUIZ
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeBbcFootball(browser, maxPages, dryRun) {
  console.log("[Scraper] Starting BBC Football Quiz...");

  const source = await prisma.quizSource.findUnique({ where: { slug: "bbc-football" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "UK" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  let imported = 0;
  let skipped = 0;

  try {
    // Get quiz links from the football quizzes index page
    const page = await browser.newPage();
    await page.goto("https://www.bbc.co.uk/sport/football-quizzes", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000);

    const quizLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="articles"]'))
        .map((a) => ({ href: a.href, text: a.textContent.trim() }))
        .filter((l) => l.text.length > 10)
        .map((l) => l.href);
    });

    // Also search for more quizzes
    try {
      await page.goto("https://www.bbc.co.uk/search?q=football+quiz&d=SPORT", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await sleep(2000);

      const searchLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href*="bbc.co.uk/sport"]'))
          .map((a) => a.href)
          .filter((href) => href.includes("articles"));
      });
      for (const link of searchLinks) {
        if (!quizLinks.includes(link)) quizLinks.push(link);
      }
    } catch (err) {
      console.error(`[Scraper] BBC search failed: ${err.message}`);
    }

    await page.close();

    // Filter out non-quiz article types (e.g. hub pages)
    const uniqueLinks = [...new Set(quizLinks)]
      .filter((u) => !u.includes("bitesize"))
      .slice(0, maxPages);
    console.log(`[Scraper] Found ${uniqueLinks.length} BBC Football quiz URLs`);

    for (const quizUrl of uniqueLinks) {
      console.log(`[Scraper] Scraping BBC: ${quizUrl}`);
      try {
        const quizPage = await browser.newPage();
        await quizPage.goto(quizUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await sleep(5000);

        // BBC quizzes use Riddle.com embeds
        const frames = quizPage.frames();
        const riddleFrame = frames.find((f) => f.url().includes("riddle"));

        if (!riddleFrame) {
          console.log(`[Scraper]   No Riddle embed found, skipping`);
          await quizPage.close();
          continue;
        }

        const qaData = await riddleFrame.evaluate(() => {
          const data = window.data;
          if (!data || !data.blocks) return [];

          return data.blocks
            .filter((b) => b.type === "SingleChoice")
            .map((b) => {
              const content = b.content || {};
              const items = content.quizItems || [];

              // Strip HTML from question title
              const questionHtml = content.title || content.description || "";
              const div = document.createElement("div");
              div.innerHTML = questionHtml;
              const questionText = div.textContent.trim();

              // In Riddle quizzes, the correct answer always has id: 0
              const correctItem = items.find((it) => it.id === 0);
              const options = items.map((it) => ({
                text: it.title.trim(),
                isCorrect: it.id === 0,
              }));

              return {
                question: questionText,
                answer: correctItem ? correctItem.title.trim() : "",
                options: options.map((o) => o.text),
              };
            })
            .filter((q) => q.question.length > 10 && q.answer);
        });

        console.log(`[Scraper]   Extracted ${qaData.length} Q&A from Riddle embed`);

        for (let i = 0; i < qaData.length; i++) {
          const qa = qaData[i];
          const opts = qa.options.map((text, idx) => ({
            label: String.fromCharCode(65 + idx),
            text,
          }));

          const slug = quizUrl.split("/").pop() || "bbc";
          const externalId = `bbc-football-${slug}-q${i + 1}`;

          const result = await importQuestion(
            {
              questionText: qa.question,
              answerText: qa.answer,
              options: opts.length > 0 ? opts : null,
              categoryId: findCategoryId("Sports"),
              subCategoryId: findSubCategoryId("Football"),
              sourceUrl: quizUrl,
              publishedDate: new Date(),
              externalId,
            },
            source.id,
            country.id,
            theme.id,
            dryRun
          );
          if (result === "imported") imported++;
          else skipped++;
        }

        await quizPage.close();
        await sleep(1000);
      } catch (err) {
        console.error(`[Scraper] BBC error for ${quizUrl}: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[Scraper] BBC Football error: ${err.message}`);
  }

  return { source: "BBC Football", imported, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// NYT QUIZ
// ═══════════════════════════════════════════════════════════════════════════

async function scrapeNyt(browser, maxPages, dryRun) {
  console.log("[Scraper] Starting NYT Quiz...");
  console.log("[Scraper] Note: NYT requires a paid subscription. Attempting to scrape accessible content...");

  const source = await prisma.quizSource.findUnique({ where: { slug: "nyt-quiz" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "US" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  let imported = 0;
  let skipped = 0;

  try {
    const page = await browser.newPage();

    // NYT spotlight page lists quiz articles
    await page.goto("https://www.nytimes.com/spotlight/news-quiz", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(3000);

    // Get quiz article links from the listing
    const quizLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a[href]"))
        .map((a) => a.href)
        .filter(
          (href) =>
            href.includes("nytimes.com/") &&
            href.match(/\/\d{4}\/\d{2}\/\d{2}\//) &&
            href.includes("news-quiz")
        )
        .filter((href, idx, arr) => arr.indexOf(href) === idx);
    });

    console.log(`[Scraper] Found ${quizLinks.length} NYT quiz links`);

    for (const url of quizLinks.slice(0, maxPages)) {
      console.log(`[Scraper] Scraping NYT: ${url}`);
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(3000);

        // NYT quizzes are behind a paywall - try to extract any visible content
        const qaData = await page.evaluate(() => {
          const results = [];
          const questionEls = document.querySelectorAll(
            "[class*='quiz'] [class*='question'], .g-question, [data-testid*='question'], [class*='QuizQuestion']"
          );

          for (const qEl of questionEls) {
            const qText = qEl.textContent.trim();
            if (qText.length < 15) continue;

            const parent =
              qEl.closest("[class*='quiz-item'], [class*='question-container'], [class*='QuizItem']") ||
              qEl.parentElement;
            const options = [];
            const answerEls =
              parent?.querySelectorAll("button, [class*='answer'], [class*='option'], [class*='Answer']") || [];

            for (const a of answerEls) {
              const text = a.textContent.trim();
              if (text.length > 0 && text.length < 200) {
                const isCorrect =
                  a.classList.contains("correct") ||
                  a.getAttribute("data-correct") === "true" ||
                  a.getAttribute("aria-label")?.includes("correct");
                options.push({ text, isCorrect });
              }
            }

            const correct = options.find((o) => o.isCorrect);
            if (correct) {
              results.push({
                question: qText,
                options: options.map((o) => o.text),
                answer: correct.text,
              });
            }
          }
          return results;
        });

        console.log(`[Scraper] NYT: extracted ${qaData.length} Q&A from ${url}`);

        // Extract date from URL
        const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
        const publishedDate = dateMatch
          ? new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]))
          : new Date();

        for (let i = 0; i < qaData.length; i++) {
          const qa = qaData[i];
          const opts = qa.options.map((text, idx) => ({
            label: String.fromCharCode(65 + idx),
            text,
          }));

          const slug = url.split("/").pop() || "nyt";
          const externalId = `nyt-${slug}-q${i + 1}`;

          const result = await importQuestion(
            {
              questionText: qa.question,
              answerText: qa.answer,
              options: opts,
              categoryId: findCategoryId("News"),
              sourceUrl: url,
              publishedDate,
              externalId,
            },
            source.id,
            country.id,
            theme.id,
            dryRun
          );
          if (result === "imported") imported++;
          else skipped++;
        }
      } catch (err) {
        console.error(`[Scraper] NYT error for ${url}: ${err.message}`);
      }
    }

    await page.close();
  } catch (err) {
    console.error(`[Scraper] NYT error: ${err.message}`);
  }

  if (imported === 0) {
    console.log("[Scraper] NYT: No questions extracted (paywall blocked). Use manual import if NYT subscription is available.");
  }

  return { source: "NYT Quiz", imported, skipped };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, ...valParts] = arg.slice(2).split("=");
      args[key] = valParts.join("=") || true;
    }
  }

  const dryRun = args["dry-run"] === true;
  const historyMode = args["history"] === true;
  let maxPages = parseInt(args["max-pages"]) || 20;
  const sourceFilter = args.source || "all";

  if (historyMode) {
    maxPages = 9999;
    console.log("[Scraper] HISTORY MODE: Scraping full archives");
  }

  console.log("═══════════════════════════════════════════════════");
  console.log("[Scraper] Quiz Database Scraper");
  console.log(`[Scraper] Mode: ${dryRun ? "DRY RUN" : "LIVE IMPORT"}${historyMode ? " (HISTORY)" : ""}`);
  console.log(`[Scraper] Max pages per source: ${maxPages}`);
  console.log(`[Scraper] Source: ${sourceFilter}`);
  console.log("═══════════════════════════════════════════════════");

  await loadLookups();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    userAgent: HEADERS["User-Agent"],
    viewport: { width: 1280, height: 10000 },
  });

  const results = [];
  const isGuardianAll = sourceFilter === "guardian-all";

  // Track all scraped Guardian URLs for deduplication with standalone
  let allGuardianScrapedUrls = new Set();

  try {
    // Guardian News (Thursday Quiz)
    if (sourceFilter === "all" || sourceFilter === "guardian" || sourceFilter === "guardian-news" || isGuardianAll) {
      results.push(await scrapeGuardianNews(context, maxPages, dryRun));
    }

    // Guardian Sports
    if (sourceFilter === "all" || sourceFilter === "guardian" || sourceFilter === "guardian-sports" || isGuardianAll) {
      results.push(await scrapeGuardianSports(context, maxPages, dryRun));
    }

    // Guardian Kids Quiz
    if (sourceFilter === "all" || sourceFilter === "guardian-kids" || isGuardianAll) {
      results.push(await scrapeGuardianKids(context, maxPages, dryRun));
    }

    // Guardian Thomas Eaton
    if (sourceFilter === "all" || sourceFilter === "guardian-eaton" || isGuardianAll) {
      results.push(await scrapeGuardianEaton(context, maxPages, dryRun));
    }

    // Guardian Newsquiz
    if (sourceFilter === "all" || sourceFilter === "guardian-newsquiz" || isGuardianAll) {
      results.push(await scrapeGuardianNewsquiz(context, maxPages, dryRun));
    }

    // Guardian Christmas
    if (sourceFilter === "all" || sourceFilter === "guardian-christmas" || isGuardianAll) {
      results.push(await scrapeGuardianChristmas(context, maxPages, dryRun));
    }

    // Guardian Standalone (catch-all, runs last to deduplicate)
    if (sourceFilter === "all" || sourceFilter === "guardian-standalone" || isGuardianAll) {
      // Collect all known Guardian series URLs to exclude from standalone
      allGuardianScrapedUrls = await collectAllGuardianSeriesUrls();
      results.push(await scrapeGuardianStandalone(context, maxPages, dryRun, allGuardianScrapedUrls));
    }

    // CNN
    if (sourceFilter === "all" || sourceFilter === "cnn") {
      results.push(await scrapeCnn(context, maxPages, dryRun));
    }

    // NPR
    if (sourceFilter === "all" || sourceFilter === "npr") {
      results.push(await scrapeNpr(context, maxPages, dryRun));
    }

    // BBC Football
    if (sourceFilter === "all" || sourceFilter === "bbc" || sourceFilter === "bbc-football") {
      results.push(await scrapeBbcFootball(context, maxPages, dryRun));
    }

    // NYT
    if (sourceFilter === "all" || sourceFilter === "nyt") {
      results.push(await scrapeNyt(context, maxPages, dryRun));
    }
  } finally {
    await browser.close();
  }

  // Update source last run info
  if (!dryRun) {
    for (const r of results) {
      const slug = slugify(r.source.replace("Quiz", "").trim());
      try {
        const sourceRecord = await prisma.quizSource.findFirst({
          where: { slug: { contains: slug } },
        });
        if (sourceRecord) {
          await prisma.quizSource.update({
            where: { id: sourceRecord.id },
            data: {
              lastRunAt: new Date(),
              lastRunStatus: r.imported > 0 ? "success" : "empty",
              lastRunCount: r.imported,
            },
          });
        }
      } catch (err) {
        console.error(`[Scraper] Error updating source run info for ${r.source}: ${err.message}`);
      }
    }
  }

  // Print summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log("[Scraper] RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════");
  let totalImported = 0;
  let totalSkipped = 0;
  for (const r of results) {
    console.log(`  ${r.source}: ${r.imported} imported, ${r.skipped} skipped`);
    totalImported += r.imported;
    totalSkipped += r.skipped;
  }
  console.log(`  TOTAL: ${totalImported} imported, ${totalSkipped} skipped`);
  console.log("═══════════════════════════════════════════════════");

  const total = await prisma.quizQuestion.count();
  console.log(`[Scraper] Database now contains ${total} total questions`);
}

main()
  .catch((error) => {
    console.error("[Scraper] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
