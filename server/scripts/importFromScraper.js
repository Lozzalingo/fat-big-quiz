#!/usr/bin/env node
/**
 * CLI import script for quiz questions from Python scrapers
 *
 * Usage:
 *   node server/scripts/importFromScraper.js --source=cnn-quiz --country=US --file=./output.json
 *   cat output.json | node server/scripts/importFromScraper.js --source=cnn-quiz --country=US --stdin
 *
 * Expected JSON format (array):
 * [
 *   {
 *     "category": "Sports",
 *     "subCategory": "Football",
 *     "dateListed": "07/07/2026",
 *     "question": "Which team won? [A) Chelsea | B) Arsenal | C) Liverpool | D) Spurs]",
 *     "answer": "Arsenal",
 *     "externalId": "QSC-W12-003"
 *   }
 * ]
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Parse CLI args ─────────────────────────────────────────────────────────

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--")) {
      const [key, ...valParts] = arg.slice(2).split("=");
      args[key] = valParts.join("=") || true;
    }
  }
  return args;
}

// ─── Parse scraper question format ──────────────────────────────────────────

function parseScraperQuestion(raw) {
  const match = raw.match(/^(.*?)\s*\[([A-D]\).*)\]\s*$/s);
  if (!match) {
    return { questionText: raw.trim(), options: null };
  }

  const questionText = match[1].trim();
  const optionsRaw = match[2];
  const optionParts = optionsRaw.split("|").map((o) => o.trim());
  const options = optionParts.map((part) => {
    const optMatch = part.match(/^([A-D])\)\s*(.+)$/);
    if (optMatch) {
      return { label: optMatch[1], text: optMatch[2].trim() };
    }
    return { label: "?", text: part };
  });

  return { questionText, options };
}

// ─── Main import function ───────────────────────────────────────────────────

async function importQuestions(questions, sourceSlug, countryCode) {
  console.log(`[QuizDB Import] Starting import: ${questions.length} questions from ${sourceSlug}`);

  // Resolve source
  const source = await prisma.quizSource.findUnique({ where: { slug: sourceSlug } });
  if (!source) {
    console.error(`[QuizDB Import] Source not found: ${sourceSlug}`);
    console.error("[QuizDB Import] Valid sources:");
    const allSources = await prisma.quizSource.findMany({ select: { slug: true, name: true } });
    allSources.forEach((s) => console.error(`  - ${s.slug} (${s.name})`));
    process.exit(1);
  }

  // Resolve country
  const country = countryCode
    ? await prisma.quizCountry.findUnique({ where: { code: countryCode } })
    : await prisma.quizCountry.findUnique({ where: { code: "WORLD" } });
  if (!country) {
    console.error(`[QuizDB Import] Country not found: ${countryCode}`);
    process.exit(1);
  }

  // Resolve default theme
  const generalTheme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

  // Pre-load categories
  const allCategories = await prisma.quizCategory.findMany();
  const categoryNameMap = {};
  for (const cat of allCategories) {
    categoryNameMap[cat.name.toLowerCase()] = cat.id;
  }

  // Pre-load sub-categories
  const allSubCategories = await prisma.quizSubCategory.findMany();
  const subCategoryNameMap = {};
  for (const sub of allSubCategories) {
    subCategoryNameMap[sub.name.toLowerCase()] = sub.id;
  }

  let imported = 0;
  let duplicatesSkipped = 0;
  let errors = 0;

  for (const q of questions) {
    try {
      const rawQuestion = q.question || q.questionText || "";
      const { questionText, options } = parseScraperQuestion(rawQuestion);
      const answerText = q.answer || q.answerText || "";

      if (!questionText || !answerText) {
        console.error(`[QuizDB Import] Skipping - missing question or answer: ${rawQuestion.slice(0, 50)}`);
        errors++;
        continue;
      }

      // Check for duplicate
      const externalId = q.externalId || null;
      if (externalId) {
        const existing = await prisma.quizQuestion.findUnique({ where: { externalId } });
        if (existing) {
          duplicatesSkipped++;
          continue;
        }
      } else {
        const existing = await prisma.quizQuestion.findFirst({
          where: { questionText: { equals: questionText }, sourceId: source.id },
        });
        if (existing) {
          duplicatesSkipped++;
          continue;
        }
      }

      // Map category
      const categoryName = (q.category || "News").toLowerCase();
      const categoryId = categoryNameMap[categoryName] || categoryNameMap["news"];

      // Map sub-category
      const subCategoryName = q.subCategory ? q.subCategory.toLowerCase() : null;
      const subCategoryId = subCategoryName ? subCategoryNameMap[subCategoryName] || null : null;

      // Parse date
      let publishedDate = null;
      let year = null;
      if (q.dateListed || q.publishedDate) {
        const dateStr = q.dateListed || q.publishedDate;
        const dateParts = dateStr.split("/");
        if (dateParts.length === 3) {
          const [day, month, yr] = dateParts;
          publishedDate = new Date(parseInt(yr), parseInt(month) - 1, parseInt(day));
          year = parseInt(yr);
        } else {
          publishedDate = new Date(dateStr);
          year = publishedDate.getFullYear();
        }
      }

      await prisma.quizQuestion.create({
        data: {
          questionText,
          questionOriginal: rawQuestion || null,
          answerText,
          answerOriginal: q.answer || q.answerText || null,
          options: options ? JSON.stringify(options) : null,
          difficulty: q.difficulty || "MEDIUM",
          questionType: options && options.length > 0 ? "MULTIPLE_CHOICE" : "OPEN_ANSWER",
          categoryId,
          subCategoryId,
          countryId: country.id,
          themeId: generalTheme?.id || null,
          sourceId: source.id,
          sourceUrl: q.sourceUrl || null,
          publishedDate,
          year,
          scrapedDate: new Date(),
          week: q.week || null,
          externalId,
        },
      });
      imported++;
    } catch (err) {
      console.error(`[QuizDB Import] Error importing question: ${err.message}`);
      errors++;
    }
  }

  // Update source last run info
  await prisma.quizSource.update({
    where: { id: source.id },
    data: {
      lastRunAt: new Date(),
      lastRunStatus: errors === 0 ? "success" : "partial",
      lastRunCount: imported,
    },
  });

  console.log(`[QuizDB Import] Complete: ${imported} imported, ${duplicatesSkipped} duplicates skipped, ${errors} errors`);
  return { imported, duplicatesSkipped, errors };
}

// ─── CLI Entry Point ────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (!args.source) {
    console.error("Usage: node importFromScraper.js --source=<slug> [--country=<code>] [--file=<path>] [--stdin]");
    console.error("");
    console.error("Options:");
    console.error("  --source   Source slug (e.g. cnn-quiz, bbc-football, guardian-news-quiz)");
    console.error("  --country  Country code (default: WORLD). Options: UK, US, CA, AU, IE, NZ, WORLD");
    console.error("  --file     Path to JSON file");
    console.error("  --stdin    Read JSON from stdin");
    process.exit(1);
  }

  let jsonData;

  if (args.file) {
    // Read from file
    if (!fs.existsSync(args.file)) {
      console.error(`[QuizDB Import] File not found: ${args.file}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(args.file, "utf8");
    jsonData = JSON.parse(raw);
  } else if (args.stdin) {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    jsonData = JSON.parse(raw);
  } else {
    console.error("[QuizDB Import] Specify --file=<path> or --stdin");
    process.exit(1);
  }

  if (!Array.isArray(jsonData)) {
    console.error("[QuizDB Import] JSON must be an array of questions");
    process.exit(1);
  }

  await importQuestions(jsonData, args.source, args.country || "WORLD");
}

main()
  .catch((error) => {
    console.error("[QuizDB Import] Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
