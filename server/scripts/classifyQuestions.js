#!/usr/bin/env node

/**
 * CLI script to classify quiz questions using the LLM classifier.
 *
 * Usage:
 *   node server/scripts/classifyQuestions.js                                # classify 100 UNVERIFIED questions
 *   node server/scripts/classifyQuestions.js --limit=500                    # classify 500 questions
 *   node server/scripts/classifyQuestions.js --all                          # classify all UNVERIFIED questions (batched)
 *   node server/scripts/classifyQuestions.js --provider=deepseek            # use DeepSeek instead of Gemini
 *   node server/scripts/classifyQuestions.js --model=gpt-4.1-nano           # specific model
 *   node server/scripts/classifyQuestions.js --source=cnn-quiz              # only questions from a specific source
 *   node server/scripts/classifyQuestions.js --status=UNVERIFIED            # filter by status (default: UNVERIFIED)
 *   node server/scripts/classifyQuestions.js --concurrency=10               # parallel requests (default: 5)
 *   node server/scripts/classifyQuestions.js --dry-run                      # preview without writing to DB
 *   node server/scripts/classifyQuestions.js --stats                        # show classification stats only
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const { classifyQuestions } = require("../services/questionClassifier");

const prisma = new PrismaClient();

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--all") {
      args.all = true;
    } else if (arg === "--stats") {
      args.statsOnly = true;
    } else if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value;
    }
  }
  return args;
}

async function showStats() {
  const [total, byStatus, bySource] = await Promise.all([
    prisma.quizQuestion.count(),
    prisma.quizQuestion.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.quizQuestion.groupBy({
      by: ["sourceId", "status"],
      _count: true,
    }),
  ]);

  const sources = await prisma.quizSource.findMany({
    select: { id: true, name: true, slug: true },
  });
  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));

  console.log("\n=== Classification Stats ===\n");
  console.log(`Total questions: ${total}`);
  console.log("\nBy status:");
  for (const s of byStatus) {
    const pct = ((s._count / total) * 100).toFixed(1);
    console.log(`  ${s.status.padEnd(12)} ${String(s._count).padStart(7)} (${pct}%)`);
  }

  // Group by source
  const sourceStats = {};
  for (const row of bySource) {
    const src = sourceMap[row.sourceId];
    if (!src) continue;
    if (!sourceStats[src.slug]) {
      sourceStats[src.slug] = { name: src.name, statuses: {} };
    }
    sourceStats[src.slug].statuses[row.status] = row._count;
  }

  console.log("\nBy source:");
  for (const [slug, data] of Object.entries(sourceStats)) {
    const unverified = data.statuses.UNVERIFIED || 0;
    const verified = data.statuses.VERIFIED || 0;
    const flagged = data.statuses.FLAGGED || 0;
    const sourceTotal = unverified + verified + flagged;
    console.log(
      `  ${data.name.padEnd(25)} total: ${String(sourceTotal).padStart(6)} | unverified: ${String(unverified).padStart(6)} | verified: ${String(verified).padStart(6)} | flagged: ${String(flagged).padStart(4)}`
    );
  }

  // Count questions with no category assigned (still on default)
  const noCategory = await prisma.quizQuestion.count({
    where: { category: { slug: "news" } },
  });
  const noTheme = await prisma.quizQuestion.count({
    where: { theme: { name: "General" } },
  });

  console.log(`\nQuestions with default category (News): ${noCategory}`);
  console.log(`Questions with default theme (General): ${noTheme}`);
  console.log();
}

async function run() {
  const args = parseArgs();

  if (args.statsOnly) {
    await showStats();
    await prisma.$disconnect();
    return;
  }

  // Build where clause
  const where = {};
  const status = args.status || "UNVERIFIED";
  where.status = status;

  if (args.source) {
    const source = await prisma.quizSource.findUnique({
      where: { slug: args.source },
    });
    if (!source) {
      console.error(`[Classifier] Source not found: ${args.source}`);
      const allSources = await prisma.quizSource.findMany({ select: { slug: true } });
      console.error(`Available sources: ${allSources.map((s) => s.slug).join(", ")}`);
      process.exit(1);
    }
    where.sourceId = source.id;
    console.log(`[Classifier] Filtering to source: ${source.name} (${args.source})`);
  }

  const provider = args.provider || "gemini";
  const model = args.model || undefined;
  const concurrency = parseInt(args.concurrency) || 5;
  const dryRun = args.dryRun || false;
  const batchSize = 500; // Process in batches of 500 for --all mode

  // Count how many match the filter
  const matchCount = await prisma.quizQuestion.count({ where });
  console.log(`[Classifier] Found ${matchCount} questions matching filter (status: ${status})`);

  if (matchCount === 0) {
    console.log("[Classifier] Nothing to classify.");
    await prisma.$disconnect();
    return;
  }

  if (dryRun) {
    console.log("[Classifier] DRY RUN - no changes will be written to the database");
  }

  const limit = args.all ? batchSize : parseInt(args.limit) || 100;
  const totalToProcess = args.all ? matchCount : Math.min(limit, matchCount);

  console.log(`[Classifier] Will classify ${totalToProcess} questions using ${provider}${model ? `/${model}` : ""} (concurrency: ${concurrency})`);
  console.log();

  const startTime = Date.now();
  const aggregateStats = {
    total: 0,
    classified: 0,
    flagged: 0,
    errors: 0,
    skipped: 0,
    totalAttempts: 0,
    changes: { category: 0, subCategory: 0, country: 0, theme: 0, difficulty: 0 },
  };

  if (args.all) {
    // Process in batches until all done
    let remaining = matchCount;
    let batchNum = 0;

    while (remaining > 0) {
      batchNum++;
      const currentBatch = Math.min(batchSize, remaining);
      console.log(`\n--- Batch ${batchNum} (${currentBatch} questions, ${remaining} remaining) ---\n`);

      const stats = await classifyQuestions({
        where,
        limit: currentBatch,
        provider,
        model,
        dryRun,
        concurrency,
      });

      // Aggregate stats
      aggregateStats.total += stats.total;
      aggregateStats.classified += stats.classified;
      aggregateStats.flagged += stats.flagged;
      aggregateStats.errors += stats.errors;
      aggregateStats.skipped += stats.skipped;
      aggregateStats.totalAttempts += stats.totalAttempts;
      for (const key of Object.keys(aggregateStats.changes)) {
        aggregateStats.changes[key] += stats.changes[key];
      }

      remaining -= currentBatch;

      // If nothing was processed (all skipped/errored), break to avoid infinite loop
      if (stats.classified === 0 && stats.flagged === 0 && stats.errors === stats.total) {
        console.error("[Classifier] All questions in batch errored. Stopping.");
        break;
      }

      // Brief pause between batches
      if (remaining > 0) {
        console.log("[Classifier] Pausing 2s between batches...");
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } else {
    const stats = await classifyQuestions({
      where,
      limit,
      provider,
      model,
      dryRun,
      concurrency,
    });
    Object.assign(aggregateStats, stats);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgAttempts = aggregateStats.total > 0
    ? (aggregateStats.totalAttempts / aggregateStats.total).toFixed(2)
    : "0";

  console.log("\n=== Classification Complete ===\n");
  console.log(`  Total processed:  ${aggregateStats.total}`);
  console.log(`  Classified (OK):  ${aggregateStats.classified}`);
  console.log(`  Flagged (review): ${aggregateStats.flagged}`);
  console.log(`  Errors:           ${aggregateStats.errors}`);
  console.log(`  Skipped:          ${aggregateStats.skipped}`);
  console.log(`  Avg attempts:     ${avgAttempts}`);
  console.log(`  Time elapsed:     ${elapsed}s`);
  console.log(`  Changes:`);
  for (const [field, count] of Object.entries(aggregateStats.changes)) {
    if (count > 0) {
      console.log(`    ${field}: ${count}`);
    }
  }
  console.log();

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("[Classifier] Fatal error:", err);
  process.exit(1);
});
