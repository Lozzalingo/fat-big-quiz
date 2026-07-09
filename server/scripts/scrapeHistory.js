#!/usr/bin/env node
/**
 * One-off deep history scraper for quiz questions.
 * Scrapes the FULL archive of each source, tracking progress so it can be resumed.
 *
 * Usage:
 *   node server/scripts/scrapeHistory.js                      # scrape all sources
 *   node server/scripts/scrapeHistory.js --source=guardian     # one source group
 *   node server/scripts/scrapeHistory.js --source=guardian-kids  # specific series
 *   node server/scripts/scrapeHistory.js --dry-run             # preview without importing
 *   node server/scripts/scrapeHistory.js --reset               # clear progress and start fresh
 *   node server/scripts/scrapeHistory.js --status              # show progress checklist
 *
 * Sources:
 *   guardian-thursday, guardian-sports, guardian-kids,
 *   guardian-thomas-eaton, guardian-newsquiz, guardian-standalone,
 *   cnn, npr, bbc, nyt
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const { chromium } = require("playwright");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// ─── Config ─────────────────────────────────────────────────────────────────

const PROGRESS_FILE = path.join(__dirname, "../data/scrape-history-progress.json");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

// All sources with their series config
const SERIES_CONFIG = {
  "guardian-thursday": {
    label: "Guardian Thursday Quiz",
    sourceSlug: "guardian-news-quiz",
    seriesUrl: "https://www.theguardian.com/lifeandstyle/series/thursday-quiz",
    maxIndexPages: 15,
    country: "UK",
    defaultCategory: "News",
  },
  "guardian-sports": {
    label: "Guardian Sports Quiz",
    sourceSlug: "guardian-sports-quiz",
    seriesUrl: "https://www.theguardian.com/sport/series/sports-quiz-of-the-week",
    maxIndexPages: 25,
    country: "UK",
    defaultCategory: "Sports",
  },
  "guardian-kids": {
    label: "Guardian Kids Quiz",
    sourceSlug: "guardian-kids-quiz",
    seriesUrl: "https://www.theguardian.com/lifeandstyle/series/the-kids--quiz",
    maxIndexPages: 15,
    country: "UK",
    defaultCategory: "Entertainment",
  },
  "guardian-thomas-eaton": {
    label: "Guardian Thomas Eaton Quiz",
    sourceSlug: "guardian-thomas-eaton",
    seriesUrl: "https://www.theguardian.com/theguardian/series/the-quiz-thomas-eaton",
    maxIndexPages: 45,
    country: "UK",
    defaultCategory: "News",
    openAnswer: true,
  },
  "guardian-newsquiz": {
    label: "Guardian Newsquiz",
    sourceSlug: "guardian-newsquiz",
    seriesUrl: "https://www.theguardian.com/news/series/newsquiz",
    maxIndexPages: 20,
    country: "UK",
    defaultCategory: "News",
  },
  "guardian-standalone": {
    label: "Guardian Standalone Quizzes",
    sourceSlug: "guardian-standalone",
    seriesUrl: "https://www.theguardian.com/tone/quizzes",
    maxIndexPages: 290,
    country: "UK",
    defaultCategory: "News",
  },
  "cnn": {
    label: "CNN Quiz (2018-present)",
    sourceSlug: "cnn-quiz",
    country: "US",
    defaultCategory: "News",
  },
  "npr": {
    label: "NPR Weekly News Quiz",
    sourceSlug: "npr-quiz",
    country: "US",
    defaultCategory: "News",
  },
  "bbc": {
    label: "BBC Football Quiz",
    sourceSlug: "bbc-football",
    country: "UK",
    defaultCategory: "Sports",
  },
  "nyt": {
    label: "NYT Quiz (paywall)",
    sourceSlug: "nyt-quiz",
    country: "US",
    defaultCategory: "News",
  },
};

// ─── Progress tracking ──────────────────────────────────────────────────────

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("[History] Error loading progress file:", err.message);
  }
  return {};
}

function saveProgress(progress) {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function markSeriesPage(progress, seriesKey, pageNum) {
  if (!progress[seriesKey]) progress[seriesKey] = { completedPages: [], urls: {}, imported: 0, skipped: 0 };
  if (!progress[seriesKey].completedPages.includes(pageNum)) {
    progress[seriesKey].completedPages.push(pageNum);
  }
  saveProgress(progress);
}

function markUrlDone(progress, seriesKey, url, result) {
  if (!progress[seriesKey]) progress[seriesKey] = { completedPages: [], urls: {}, imported: 0, skipped: 0 };
  progress[seriesKey].urls[url] = result;
  if (result === "imported") progress[seriesKey].imported = (progress[seriesKey].imported || 0) + 1;
  saveProgress(progress);
}

function isUrlDone(progress, seriesKey, url) {
  return progress[seriesKey]?.urls?.[url] !== undefined;
}

function isPageDone(progress, seriesKey, pageNum) {
  return progress[seriesKey]?.completedPages?.includes(pageNum) || false;
}

function printStatus(progress) {
  console.log("\n=== SCRAPE HISTORY PROGRESS ===\n");
  for (const [key, config] of Object.entries(SERIES_CONFIG)) {
    const p = progress[key] || {};
    const pages = p.completedPages?.length || 0;
    const maxPages = config.maxIndexPages || "N/A";
    const urls = Object.keys(p.urls || {}).length;
    const imported = p.imported || 0;
    const status = pages > 0 ? (pages >= maxPages ? "DONE" : "IN PROGRESS") : "NOT STARTED";
    const icon = status === "DONE" ? "[x]" : status === "IN PROGRESS" ? "[-]" : "[ ]";
    console.log(`${icon} ${config.label}`);
    console.log(`    Pages: ${pages}/${maxPages} | URLs scraped: ${urls} | Imported: ${imported}`);
  }
  console.log("");
}

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
  // Duplicate check by externalId
  if (data.externalId) {
    const existing = await prisma.quizQuestion.findUnique({
      where: { externalId: data.externalId },
    });
    if (existing) return "duplicate";
  }

  // Duplicate check by question text + source
  const textMatch = await prisma.quizQuestion.findFirst({
    where: { questionText: { equals: data.questionText }, sourceId },
  });
  if (textMatch) return "duplicate";

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

// ─── Guardian open-answer quiz (Thomas Eaton / Saturday Quiz format) ───────

async function scrapeGuardianOpenAnswerPage(url) {
  try {
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const html = res.data;

    // Get published date from meta tag
    const dateMatch = html.match(/article:published_time["\s]+content="([^"]+)"/);
    const publishedDate = dateMatch ? new Date(dateMatch[1]) : null;

    // Find content between "The questions" and "The answers", then answers until end of article
    const qMatch = html.match(/The questions<\/h2>(.*?)The answers<\/h2>/s);
    const aMatch = html.match(/The answers<\/h2>(.*?)(?:<aside|<footer|<section|<div[^>]*class="[^"]*(?:rich-link|ad-slot|submeta))/s);

    if (!qMatch || !aMatch) {
      // Try alternative: numbered paragraphs without h2 headers
      return { qaData: [], publishedDate };
    }

    const qBlock = qMatch[1];
    const aBlock = aMatch[1];

    // Extract question text - strip HTML tags
    const stripHtml = (s) => s.replace(/<[^>]+>/g, "").trim();
    const qRaw = stripHtml(qBlock);
    const aRaw = stripHtml(aBlock);

    // Split by number patterns: "1 Question text" or "1. Question text"
    const qParts = qRaw.split(/(?=\b\d{1,2}\s)/).filter((s) => s.trim().length > 5);
    const aParts = aRaw.split(/(?=\b\d{1,2}\s)/).filter((s) => s.trim().length > 1);

    const qaData = [];
    for (let i = 0; i < qParts.length; i++) {
      const qText = qParts[i].replace(/^\d{1,2}\.?\s*/, "").trim();
      if (qText.length < 10) continue;

      // Find matching answer by number
      const qNum = parseInt(qParts[i].match(/^(\d{1,2})/)?.[1] || "0");
      const answerPart = aParts.find((a) => {
        const aNum = parseInt(a.match(/^(\d{1,2})/)?.[1] || "-1");
        return aNum === qNum;
      });

      const answerText = answerPart
        ? answerPart.replace(/^\d{1,2}\.?\s*/, "").trim()
        : "";

      if (answerText) {
        qaData.push({ question: qText, answer: answerText, options: [] });
      }
    }

    return { qaData, publishedDate };
  } catch (err) {
    console.error(`[History]   Open-answer parse error: ${err.message}`);
    return { qaData: [], publishedDate: null };
  }
}

// ─── Guardian shared helper (multiple choice with fieldsets) ──────────────

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
  } catch {}

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
    const results = [];

    for (const fs of outerFieldsets) {
      const legend = fs.querySelector("legend");
      if (!legend) continue;
      const qText = legend.textContent.trim().replace(/^\d+\.?\s*/, "");
      if (qText.length < 10) continue;

      const labels = Array.from(fs.querySelectorAll("label")).map((l) => {
        const firstSpan = l.querySelector("span");
        return firstSpan ? firstSpan.textContent.trim() : l.textContent.trim();
      });

      const firstRadio = fs.querySelector('input[type="radio"]');
      if (firstRadio) firstRadio.click();
      await sl(200);

      const revealBtn = fs.querySelector("button");
      if (revealBtn) revealBtn.click();
      await sl(500);

      const correctEl = fs.querySelector(
        '[data-answer-type="correct-selected-answer"], [data-answer-type="non-selected-correct-answer"]'
      );
      let answer = "";
      let explanation = "";
      if (correctEl) {
        const spans = correctEl.querySelectorAll("span");
        if (spans.length >= 1) answer = spans[0].textContent.trim();
        if (spans.length >= 2) explanation = spans[1].textContent.trim();
        if (!answer) answer = correctEl.textContent.trim();
      }

      results.push({
        question: qText,
        answer,
        explanation,
        options: labels.filter((l) => l.length > 0),
      });
    }
    return results;
  });

  return { qaData, publishedDate };
}

// ─── Get ALL quiz URLs from a Guardian series (full pagination) ────────────

async function getAllGuardianSeriesUrls(seriesUrl, maxIndexPages, progress, seriesKey) {
  const allUrls = [];

  for (let pageNum = 1; pageNum <= maxIndexPages; pageNum++) {
    // Skip pages we have already indexed
    if (isPageDone(progress, seriesKey, pageNum)) {
      console.log(`[History]   Index page ${pageNum}: already done, skipping`);
      continue;
    }

    try {
      const pageUrl = pageNum === 1 ? seriesUrl : `${seriesUrl}?page=${pageNum}`;
      const res = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(res.data);
      let foundOnPage = 0;

      // Collect all quiz-related links with a date in the URL
      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        // Accept both absolute theguardian.com links and relative links
        const isGuardianUrl = href.includes("theguardian.com") || href.startsWith("/");
        if (
          isGuardianUrl &&
          href.match(/\/\d{4}\//) &&
          !href.includes("#") &&
          !href.endsWith("/all") &&
          !href.includes("?page=") &&
          !href.includes("/series/") &&
          !href.includes("/rss")
        ) {
          const fullUrl = href.startsWith("http") ? href : `https://www.theguardian.com${href}`;
          if (!allUrls.includes(fullUrl)) {
            allUrls.push(fullUrl);
            foundOnPage++;
          }
        }
      });

      console.log(`[History]   Index page ${pageNum}/${maxIndexPages}: found ${foundOnPage} new URLs`);
      markSeriesPage(progress, seriesKey, pageNum);

      if (foundOnPage === 0) {
        console.log(`[History]   No more URLs found, stopping pagination`);
        // Mark remaining pages as done
        for (let p = pageNum + 1; p <= maxIndexPages; p++) {
          markSeriesPage(progress, seriesKey, p);
        }
        break;
      }

      await sleep(800);
    } catch (err) {
      console.error(`[History]   Error fetching index page ${pageNum}: ${err.message}`);
      // Don't break - try the next page
      await sleep(2000);
    }
  }

  return allUrls;
}

// ─── Scrape a Guardian series ──────────────────────────────────────────────

async function scrapeGuardianSeries(browser, seriesKey, config, progress, dryRun) {
  console.log(`\n[History] === ${config.label} ===`);

  const source = await prisma.quizSource.findUnique({ where: { slug: config.sourceSlug } });
  if (!source) {
    console.error(`[History] Source not found: ${config.sourceSlug}. Run seed first.`);
    return { source: config.label, imported: 0, skipped: 0 };
  }
  const country = await prisma.quizCountry.findUnique({ where: { code: config.country } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  // Step 1: Get all quiz URLs from series index pages
  console.log(`[History] Fetching quiz URLs from series index (up to ${config.maxIndexPages} pages)...`);
  const quizUrls = await getAllGuardianSeriesUrls(
    config.seriesUrl,
    config.maxIndexPages,
    progress,
    seriesKey
  );
  console.log(`[History] Total URLs found: ${quizUrls.length}`);

  // Step 2: Scrape each quiz page
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < quizUrls.length; i++) {
    const url = quizUrls[i];

    // Skip if already scraped
    if (isUrlDone(progress, seriesKey, url)) {
      skipped++;
      continue;
    }

    console.log(`[History] [${i + 1}/${quizUrls.length}] Scraping: ${url}`);
    try {
      let qaData, publishedDate;
      let browserPage = null;

      if (config.openAnswer) {
        // Open-answer format (Thomas Eaton, Newsquiz) - no Playwright needed
        const result = await scrapeGuardianOpenAnswerPage(url);
        qaData = result.qaData;
        publishedDate = result.publishedDate;
      } else {
        // Multiple-choice format (fieldsets with reveal buttons) - needs Playwright
        browserPage = await browser.newPage();
        const result = await scrapeGuardianPage(browserPage, url);
        qaData = result.qaData;
        publishedDate = result.publishedDate;
      }

      console.log(`[History]   Extracted ${qaData.length} Q&A`);

      let pageImported = 0;
      for (let j = 0; j < qaData.length; j++) {
        const qa = qaData[j];
        if (!qa.answer) continue;

        const opts = qa.options && qa.options.length > 0
          ? qa.options.map((text, idx) => ({
              label: String.fromCharCode(65 + idx),
              text,
            }))
          : null;

        const slug = url.split("/").pop() || "guardian";
        const externalId = `${config.sourceSlug}-${slug}-q${j + 1}`;

        const result = await importQuestion(
          {
            questionText: qa.question,
            answerText: qa.answer,
            explanation: qa.explanation || null,
            options: opts,
            categoryId: findCategoryId(config.defaultCategory),
            sourceUrl: url,
            publishedDate,
            externalId,
          },
          source.id,
          country.id,
          theme.id,
          dryRun
        );
        if (result === "imported") pageImported++;
      }

      imported += pageImported;
      markUrlDone(progress, seriesKey, url, pageImported > 0 ? "imported" : "no-new");
      if (browserPage) await browserPage.close();
      await sleep(config.openAnswer ? 800 : 1500); // Open-answer is lighter, can be faster
    } catch (err) {
      console.error(`[History]   Error: ${err.message}`);
      errors++;
      markUrlDone(progress, seriesKey, url, "error");
    }
  }

  console.log(`[History] ${config.label}: imported=${imported}, skipped=${skipped}, errors=${errors}`);
  return { source: config.label, imported, skipped };
}

// ─── CNN deep archive (2018-present) ───────────────────────────────────────

async function scrapeCnnHistory(browser, progress, dryRun) {
  const seriesKey = "cnn";
  console.log(`\n[History] === CNN Quiz (2018-present) ===`);

  const source = await prisma.quizSource.findUnique({ where: { slug: "cnn-quiz" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "US" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  let imported = 0;
  let skipped = 0;

  // Step 1: Collect quiz URLs from the Wayback Machine CDX API
  console.log("[History] Fetching CNN quiz URLs from Wayback Machine...");
  const quizUrls = [];

  try {
    // Use Wayback CDX API to find all CNN quiz URLs from 2018-2026
    const cdxUrl = "https://web.archive.org/cdx/search/cdx?" +
      "url=edition.cnn.com/interactive/*/us/cnn-5-things-news-quiz*&" +
      "output=json&fl=timestamp,original&collapse=urlkey&limit=5000";

    const cdxRes = await axios.get(cdxUrl, { headers: HEADERS, timeout: 30000 });
    const rows = cdxRes.data;

    if (Array.isArray(rows) && rows.length > 1) {
      // Skip header row
      for (let i = 1; i < rows.length; i++) {
        const [timestamp, originalUrl] = rows[i];
        if (originalUrl && !quizUrls.includes(originalUrl)) {
          quizUrls.push(originalUrl);
        }
      }
    }
    console.log(`[History] Found ${quizUrls.length} CNN quiz URLs from Wayback Machine`);
  } catch (err) {
    console.error(`[History] Wayback CDX error: ${err.message}`);
  }

  // Also try the current CNN search for recent quizzes
  try {
    const page = await browser.newPage();
    await page.goto("https://edition.cnn.com/search?q=5+things+news+quiz&size=50&sort=newest&category=us", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(3000);

    const searchLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="quiz"]'))
        .map((a) => a.href)
        .filter((href) => href.includes("interactive") || href.includes("quiz"))
        .filter((href) => !href.includes("search"));
    });
    for (const link of searchLinks) {
      if (!quizUrls.includes(link)) quizUrls.push(link);
    }
    await page.close();
    console.log(`[History] Total CNN URLs after search: ${quizUrls.length}`);
  } catch (err) {
    console.error(`[History] CNN search error: ${err.message}`);
  }

  // Step 2: Scrape each quiz
  for (let i = 0; i < quizUrls.length; i++) {
    const url = quizUrls[i];
    if (isUrlDone(progress, seriesKey, url)) {
      skipped++;
      continue;
    }

    console.log(`[History] [${i + 1}/${quizUrls.length}] Scraping CNN: ${url}`);
    try {
      const page = await browser.newPage();

      // Try the live URL first, fall back to Wayback
      let finalUrl = url;
      try {
        const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 20000 });
        if (!resp || resp.status() >= 400) {
          // Try Wayback version
          finalUrl = `https://web.archive.org/web/2024/${url}`;
          await page.goto(finalUrl, { waitUntil: "networkidle", timeout: 20000 });
        }
      } catch {
        finalUrl = `https://web.archive.org/web/2024/${url}`;
        try {
          await page.goto(finalUrl, { waitUntil: "networkidle", timeout: 20000 });
        } catch {
          markUrlDone(progress, seriesKey, url, "error");
          await page.close();
          continue;
        }
      }

      await sleep(3000);

      const qaData = await page.evaluate(async () => {
        function sl(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        const results = [];
        const questionBlocks = document.querySelectorAll(".questionBlock, .quiz--question, [class*='question-block']");

        for (const block of questionBlocks) {
          const qContent = block.querySelector(".quiz--question__content, [class*='question__content'], [class*='question-text']");
          const qText = qContent ? qContent.textContent.trim() : "";
          if (qText.length < 10) continue;

          const optionEls = Array.from(block.querySelectorAll(".questionOption, ._question-block_option, [class*='option']"));
          const options = optionEls.map((o) => o.textContent.trim()).filter((t) => t.length > 0 && t.length < 200);

          if (optionEls[0]) optionEls[0].click();
          await sl(300);

          let correctAnswer = "";
          let explanation = "";
          for (const opt of optionEls) {
            const classes = Array.from(opt.classList);
            if (classes.some((c) => c.startsWith("the-"))) {
              correctAnswer = opt.textContent.trim();
            }
          }

          const responseEl = block.querySelector("._question-block_answer-response__copy, .answerResponse, [class*='answer-response']");
          if (responseEl) explanation = responseEl.textContent.trim();

          if (correctAnswer) {
            results.push({ question: qText, answer: correctAnswer, explanation, options });
          }
        }
        return results;
      });

      console.log(`[History]   Extracted ${qaData.length} Q&A`);

      const dateMatch = url.match(/\/(\d{4})\/(\d{2})\//);
      const publishedDate = dateMatch
        ? new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, 1)
        : null;

      let pageImported = 0;
      for (let j = 0; j < qaData.length; j++) {
        const qa = qaData[j];
        const opts = qa.options.map((text, idx) => ({
          label: String.fromCharCode(65 + idx),
          text,
        }));
        const slug = url.split("/").pop() || "cnn";
        const externalId = `cnn-quiz-${slug}-q${j + 1}`;

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
        if (result === "imported") pageImported++;
      }

      imported += pageImported;
      markUrlDone(progress, seriesKey, url, pageImported > 0 ? "imported" : "no-new");
      await page.close();
      await sleep(2000);
    } catch (err) {
      console.error(`[History]   Error: ${err.message}`);
      markUrlDone(progress, seriesKey, url, "error");
    }
  }

  return { source: "CNN Quiz", imported, skipped };
}

// ─── NPR deep archive ─────────────────────────────────────────────────────

async function scrapeNprHistory(browser, progress, dryRun) {
  const seriesKey = "npr";
  console.log(`\n[History] === NPR Weekly News Quiz ===`);

  const source = await prisma.quizSource.findUnique({ where: { slug: "npr-quiz" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "US" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  let imported = 0;
  let skipped = 0;

  // NPR series page - paginate to get all quiz article URLs
  const quizUrls = [];
  console.log("[History] Fetching NPR quiz URLs from series pages...");

  for (let pageNum = 1; pageNum <= 20; pageNum++) {
    if (isPageDone(progress, seriesKey, pageNum)) {
      console.log(`[History]   NPR page ${pageNum}: already indexed, skipping`);
      continue;
    }

    try {
      const pageUrl = `https://www.npr.org/series/1146192567/weekly-news-quiz?page=${pageNum}`;
      const res = await axios.get(pageUrl, { headers: HEADERS, timeout: 15000 });
      const $ = cheerio.load(res.data);
      let foundOnPage = 0;

      $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (href && (href.includes("news-quiz") || href.includes("weekly-quiz")) && href.match(/\/\d{4}\//)) {
          const fullUrl = href.startsWith("http") ? href : `https://www.npr.org${href}`;
          if (!quizUrls.includes(fullUrl)) {
            quizUrls.push(fullUrl);
            foundOnPage++;
          }
        }
      });

      console.log(`[History]   NPR page ${pageNum}: found ${foundOnPage} new URLs`);
      markSeriesPage(progress, seriesKey, pageNum);

      if (foundOnPage === 0) break;
      await sleep(800);
    } catch (err) {
      console.error(`[History]   NPR page ${pageNum} error: ${err.message}`);
      break;
    }
  }

  console.log(`[History] Total NPR URLs: ${quizUrls.length}`);

  // Scrape each quiz
  for (let i = 0; i < quizUrls.length; i++) {
    const url = quizUrls[i];
    if (isUrlDone(progress, seriesKey, url)) {
      skipped++;
      continue;
    }

    console.log(`[History] [${i + 1}/${quizUrls.length}] Scraping NPR: ${url}`);
    try {
      const articleRes = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      const flourishMatch = articleRes.data.match(/flo\.uri\.sh\/visualisation\/(\d+)\/embed/);
      if (!flourishMatch) {
        console.log(`[History]   No Flourish embed found, skipping`);
        markUrlDone(progress, seriesKey, url, "no-embed");
        continue;
      }

      const flourishUrl = `https://flo.uri.sh/visualisation/${flourishMatch[1]}/embed`;
      const dateMatch = url.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//);
      const publishedDate = dateMatch
        ? new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3]))
        : null;

      const page = await browser.newPage();
      await page.goto(flourishUrl, { waitUntil: "networkidle", timeout: 30000 });
      await sleep(2000);

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
            if (correctEl) options.push(correctEl.textContent.trim());
            wrongEls.forEach((el) => options.push(el.textContent.trim()));

            if (answer) results.push({ question: qText, answer, options });
          }
        }
        return results;
      });

      console.log(`[History]   Extracted ${qaData.length} Q&A from Flourish`);

      let pageImported = 0;
      for (let j = 0; j < qaData.length; j++) {
        const qa = qaData[j];
        if (!qa.answer) continue;
        const opts = qa.options.length > 0
          ? qa.options.map((text, idx) => ({ label: String.fromCharCode(65 + idx), text }))
          : null;
        const externalId = `npr-${flourishMatch[1]}-q${j + 1}`;

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
        if (result === "imported") pageImported++;
      }

      imported += pageImported;
      markUrlDone(progress, seriesKey, url, pageImported > 0 ? "imported" : "no-new");
      await page.close();
      await sleep(1500);
    } catch (err) {
      console.error(`[History]   Error: ${err.message}`);
      markUrlDone(progress, seriesKey, url, "error");
    }
  }

  return { source: "NPR Quiz", imported, skipped };
}

// ─── BBC Football deep archive ─────────────────────────────────────────────

async function scrapeBbcHistory(browser, progress, dryRun) {
  const seriesKey = "bbc";
  console.log(`\n[History] === BBC Football Quiz ===`);

  const source = await prisma.quizSource.findUnique({ where: { slug: "bbc-football" } });
  const country = await prisma.quizCountry.findUnique({ where: { code: "UK" } });
  const theme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  let imported = 0;
  let skipped = 0;

  try {
    const page = await browser.newPage();
    await page.goto("https://www.bbc.co.uk/sport/football-quizzes", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(2000);

    const quizLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href*="articles"]'))
        .map((a) => a.href)
        .filter((href) => !href.includes("bitesize"));
    });

    // Also try BBC search
    try {
      await page.goto("https://www.bbc.co.uk/search?q=football+quiz&d=SPORT&page=1", {
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
    } catch {}

    await page.close();

    const uniqueLinks = [...new Set(quizLinks)];
    console.log(`[History] Found ${uniqueLinks.length} BBC Football quiz URLs`);

    for (let i = 0; i < uniqueLinks.length; i++) {
      const quizUrl = uniqueLinks[i];
      if (isUrlDone(progress, seriesKey, quizUrl)) {
        skipped++;
        continue;
      }

      console.log(`[History] [${i + 1}/${uniqueLinks.length}] Scraping BBC: ${quizUrl}`);
      try {
        const quizPage = await browser.newPage();
        await quizPage.goto(quizUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(5000);

        const frames = quizPage.frames();
        const riddleFrame = frames.find((f) => f.url().includes("riddle"));

        if (!riddleFrame) {
          console.log(`[History]   No Riddle embed, skipping`);
          markUrlDone(progress, seriesKey, quizUrl, "no-embed");
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
              const div = document.createElement("div");
              div.innerHTML = content.title || content.description || "";
              const questionText = div.textContent.trim();
              const correctItem = items.find((it) => it.id === 0);
              return {
                question: questionText,
                answer: correctItem ? correctItem.title.trim() : "",
                options: items.map((it) => it.title.trim()),
              };
            })
            .filter((q) => q.question.length > 10 && q.answer);
        });

        console.log(`[History]   Extracted ${qaData.length} Q&A from Riddle`);

        let pageImported = 0;
        for (let j = 0; j < qaData.length; j++) {
          const qa = qaData[j];
          const opts = qa.options.map((text, idx) => ({ label: String.fromCharCode(65 + idx), text }));
          const slug = quizUrl.split("/").pop() || "bbc";
          const externalId = `bbc-football-${slug}-q${j + 1}`;

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
          if (result === "imported") pageImported++;
        }

        imported += pageImported;
        markUrlDone(progress, seriesKey, quizUrl, pageImported > 0 ? "imported" : "no-new");
        await quizPage.close();
        await sleep(1500);
      } catch (err) {
        console.error(`[History]   Error: ${err.message}`);
        markUrlDone(progress, seriesKey, quizUrl, "error");
      }
    }
  } catch (err) {
    console.error(`[History] BBC error: ${err.message}`);
  }

  return { source: "BBC Football", imported, skipped };
}

// ─── NYT (paywall - best effort) ──────────────────────────────────────────

async function scrapeNytHistory(browser, progress, dryRun) {
  console.log(`\n[History] === NYT Quiz (paywall blocked) ===`);
  console.log("[History] NYT requires a paid subscription. Skipping unless subscription is available.");
  console.log("[History] Use manual import if you have NYT access.");
  return { source: "NYT Quiz", imported: 0, skipped: 0 };
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
  const sourceFilter = args.source || "all";
  let progress = loadProgress();

  // --reset: clear progress
  if (args.reset) {
    console.log("[History] Resetting progress...");
    progress = {};
    saveProgress(progress);
    console.log("[History] Progress cleared.");
    if (!args.source && !args["dry-run"]) return;
  }

  // --status: show checklist
  if (args.status) {
    printStatus(progress);
    return;
  }

  console.log("===============================================================");
  console.log("[History] Quiz Database History Scraper");
  console.log(`[History] Mode: ${dryRun ? "DRY RUN" : "LIVE IMPORT"}`);
  console.log(`[History] Source: ${sourceFilter}`);
  console.log("===============================================================");

  printStatus(progress);

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

  const shouldRun = (key) => {
    if (sourceFilter === "all") return true;
    if (sourceFilter === "guardian") return key.startsWith("guardian");
    return sourceFilter === key;
  };

  try {
    // Guardian series
    for (const [key, config] of Object.entries(SERIES_CONFIG)) {
      if (!shouldRun(key)) continue;

      if (key.startsWith("guardian")) {
        results.push(await scrapeGuardianSeries(context, key, config, progress, dryRun));
      } else if (key === "cnn") {
        results.push(await scrapeCnnHistory(context, progress, dryRun));
      } else if (key === "npr") {
        results.push(await scrapeNprHistory(context, progress, dryRun));
      } else if (key === "bbc") {
        results.push(await scrapeBbcHistory(context, progress, dryRun));
      } else if (key === "nyt") {
        results.push(await scrapeNytHistory(context, progress, dryRun));
      }
    }
  } finally {
    await browser.close();
  }

  // Update source last run info
  if (!dryRun) {
    for (const r of results) {
      try {
        const slug = slugify(r.source.replace("Quiz", "").replace("Guardian ", "guardian-").trim());
        const sourceRecord = await prisma.quizSource.findFirst({
          where: { slug: { contains: slug.substring(0, 10) } },
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
      } catch {}
    }
  }

  // Print final summary
  console.log("\n===============================================================");
  console.log("[History] RESULTS SUMMARY");
  console.log("===============================================================");
  let totalImported = 0;
  let totalSkipped = 0;
  for (const r of results) {
    console.log(`  ${r.source}: ${r.imported} imported, ${r.skipped} skipped`);
    totalImported += r.imported;
    totalSkipped += r.skipped;
  }
  console.log(`  TOTAL: ${totalImported} imported, ${totalSkipped} skipped`);
  console.log("===============================================================");

  printStatus(progress);

  const total = await prisma.quizQuestion.count();
  console.log(`\n[History] Database now contains ${total} total questions`);
}

main()
  .catch((error) => {
    console.error("[History] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
