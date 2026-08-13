const prisma = require("../utils/prisma");
const { classifyNewlyImported } = require("../services/questionClassifier");

// ─── Helper: Parse scraper format ───────────────────────────────────────────
// Splits "Question text [A) Option1 | B) Option2 | C) Option3 | D) Option4]"
// into { questionText, options }

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

// ─── Public: Get all questions with filtering ───────────────────────────────

async function getAllQuestions(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      categoryId,
      subCategoryId,
      countryId,
      themeId,
      sourceId,
      difficulty,
      questionType,
      status,
      year,
      yearFrom,
      yearTo,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = {};

    if (categoryId) where.categoryId = categoryId;
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (countryId) where.countryId = countryId;
    if (themeId) where.themeId = themeId;
    if (sourceId) where.sourceId = sourceId;
    if (difficulty) where.difficulty = difficulty;
    if (questionType) where.questionType = questionType;
    if (status) {
      where.status = status;
    } else {
      // Hide flagged questions from public results by default
      where.status = { not: "FLAGGED" };
    }

    // Year filtering - single year or range
    if (year) {
      where.year = parseInt(year);
    } else if (yearFrom || yearTo) {
      where.year = {};
      if (yearFrom) where.year.gte = parseInt(yearFrom);
      if (yearTo) where.year.lte = parseInt(yearTo);
    }

    // Full text search
    if (search) {
      where.OR = [
        { questionText: { contains: search } },
        { answerText: { contains: search } },
      ];
    }

    const [questions, total] = await Promise.all([
      prisma.quizQuestion.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subCategory: { select: { id: true, name: true, slug: true } },
          country: { select: { id: true, name: true, code: true } },
          theme: { select: { id: true, name: true, slug: true } },
          source: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.quizQuestion.count({ where }),
    ]);

    console.log(`[QuizDB] Fetched ${questions.length} questions (page ${pageNum}, total ${total})`);

    return res.json({
      questions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("[QuizDB] Error fetching questions:", error);
    return res.status(500).json({ error: "Error fetching questions" });
  }
}

// ─── Public: Get single question ────────────────────────────────────────────

async function getQuestionById(req, res) {
  try {
    const { id } = req.params;

    const question = await prisma.quizQuestion.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        country: true,
        theme: true,
        source: true,
      },
    });

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    return res.json(question);
  } catch (error) {
    console.error("[QuizDB] Error fetching question:", error);
    return res.status(500).json({ error: "Error fetching question" });
  }
}

// ─── Admin: Create question ─────────────────────────────────────────────────

async function createQuestion(req, res) {
  try {
    const {
      questionText,
      answerText,
      options,
      explanation,
      difficulty,
      questionType,
      categoryId,
      subCategoryId,
      countryId,
      themeId,
      sourceId,
      sourceUrl,
      publishedDate,
      year,
      externalId,
    } = req.body;

    if (!questionText || !answerText || !categoryId || !countryId || !themeId || !sourceId) {
      return res.status(400).json({
        error: "questionText, answerText, categoryId, countryId, themeId, and sourceId are required",
      });
    }

    // Check for duplicate by externalId
    if (externalId) {
      const existing = await prisma.quizQuestion.findUnique({
        where: { externalId },
      });
      if (existing) {
        return res.status(409).json({ error: "Question with this externalId already exists" });
      }
    }

    const derivedYear = year || (publishedDate ? new Date(publishedDate).getFullYear() : null);

    const question = await prisma.quizQuestion.create({
      data: {
        questionText,
        answerText,
        options: options ? (typeof options === "string" ? options : JSON.stringify(options)) : null,
        explanation: explanation || null,
        difficulty: difficulty || "MEDIUM",
        questionType: questionType || "MULTIPLE_CHOICE",
        categoryId,
        subCategoryId: subCategoryId || null,
        countryId,
        themeId,
        sourceId,
        sourceUrl: sourceUrl || null,
        publishedDate: publishedDate ? new Date(publishedDate) : null,
        year: derivedYear,
        externalId: externalId || null,
      },
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        theme: { select: { id: true, name: true } },
        source: { select: { id: true, name: true } },
      },
    });

    console.log(`[QuizDB] Created question: ${question.id}`);
    return res.status(201).json(question);
  } catch (error) {
    console.error("[QuizDB] Error creating question:", error);
    return res.status(500).json({ error: "Error creating question" });
  }
}

// ─── Admin: Update question ─────────────────────────────────────────────────

async function updateQuestion(req, res) {
  try {
    const { id } = req.params;
    const data = req.body;

    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Question not found" });
    }

    const updateData = {};
    const fields = [
      "questionText", "questionOriginal", "answerText", "answerOriginal",
      "explanation", "difficulty", "questionType", "status",
      "categoryId", "subCategoryId", "countryId", "themeId", "sourceId",
      "sourceUrl", "externalId", "week",
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (data.options !== undefined) {
      updateData.options = typeof data.options === "string" ? data.options : JSON.stringify(data.options);
    }

    if (data.publishedDate !== undefined) {
      updateData.publishedDate = data.publishedDate ? new Date(data.publishedDate) : null;
      updateData.year = data.publishedDate ? new Date(data.publishedDate).getFullYear() : existing.year;
    }

    if (data.year !== undefined) {
      updateData.year = data.year;
    }

    const question = await prisma.quizQuestion.update({
      where: { id },
      data: updateData,
      include: {
        category: { select: { id: true, name: true } },
        subCategory: { select: { id: true, name: true } },
        country: { select: { id: true, name: true } },
        theme: { select: { id: true, name: true } },
        source: { select: { id: true, name: true } },
      },
    });

    console.log(`[QuizDB] Updated question: ${id}`);
    return res.json(question);
  } catch (error) {
    console.error("[QuizDB] Error updating question:", error);
    return res.status(500).json({ error: "Error updating question" });
  }
}

// ─── Admin: Delete question ─────────────────────────────────────────────────

async function deleteQuestion(req, res) {
  try {
    const { id } = req.params;

    const existing = await prisma.quizQuestion.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Question not found" });
    }

    await prisma.quizQuestion.delete({ where: { id } });
    console.log(`[QuizDB] Deleted question: ${id}`);
    return res.status(204).send();
  } catch (error) {
    console.error("[QuizDB] Error deleting question:", error);
    return res.status(500).json({ error: "Error deleting question" });
  }
}

// ─── Public: Get stats ──────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const [
      total,
      byCategory,
      bySource,
      byDifficulty,
      byQuestionType,
      byYear,
      byCountry,
      byStatus,
    ] = await Promise.all([
      prisma.quizQuestion.count(),
      prisma.quizQuestion.groupBy({
        by: ["categoryId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.quizQuestion.groupBy({
        by: ["sourceId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.quizQuestion.groupBy({
        by: ["difficulty"],
        _count: { id: true },
      }),
      prisma.quizQuestion.groupBy({
        by: ["questionType"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.quizQuestion.groupBy({
        by: ["year"],
        _count: { id: true },
        orderBy: { year: "desc" },
        where: { year: { not: null } },
      }),
      prisma.quizQuestion.groupBy({
        by: ["countryId"],
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
      prisma.quizQuestion.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    // Enrich with names
    const [categories, sources, countries] = await Promise.all([
      prisma.quizCategory.findMany({ select: { id: true, name: true } }),
      prisma.quizSource.findMany({ select: { id: true, name: true, lastRunAt: true, lastRunStatus: true } }),
      prisma.quizCountry.findMany({ select: { id: true, name: true, code: true } }),
    ]);

    const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s]));
    const countryMap = Object.fromEntries(countries.map((c) => [c.id, c.name]));

    return res.json({
      total,
      byCategory: byCategory.map((g) => ({ name: categoryMap[g.categoryId], id: g.categoryId, count: g._count.id })),
      bySource: bySource.map((g) => ({
        name: sourceMap[g.sourceId]?.name,
        id: g.sourceId,
        count: g._count.id,
        lastRunAt: sourceMap[g.sourceId]?.lastRunAt,
        lastRunStatus: sourceMap[g.sourceId]?.lastRunStatus,
      })),
      byDifficulty: Object.fromEntries(byDifficulty.map((g) => [g.difficulty.toLowerCase(), g._count.id])),
      byQuestionType: byQuestionType.map((g) => ({ type: g.questionType, count: g._count.id })),
      byYear: byYear.map((g) => ({ year: g.year, count: g._count.id })),
      byCountry: byCountry.map((g) => ({ name: countryMap[g.countryId], id: g.countryId, count: g._count.id })),
      byStatus: Object.fromEntries(byStatus.map((g) => [g.status.toLowerCase(), g._count.id])),
    });
  } catch (error) {
    console.error("[QuizDB] Error fetching stats:", error);
    return res.status(500).json({ error: "Error fetching stats" });
  }
}

// ─── Admin: Bulk import from scrapers ───────────────────────────────────────

async function importQuestions(req, res) {
  try {
    const { questions, sourceSlug, countryCode } = req.body;

    if (!questions || !Array.isArray(questions) || !sourceSlug) {
      return res.status(400).json({ error: "questions (array) and sourceSlug are required" });
    }

    // Resolve source
    const source = await prisma.quizSource.findUnique({ where: { slug: sourceSlug } });
    if (!source) {
      return res.status(400).json({ error: `Source not found: ${sourceSlug}` });
    }

    // Resolve country
    const country = countryCode
      ? await prisma.quizCountry.findUnique({ where: { code: countryCode } })
      : await prisma.quizCountry.findUnique({ where: { code: "WORLD" } });
    if (!country) {
      return res.status(400).json({ error: `Country not found: ${countryCode}` });
    }

    // Resolve default theme (General)
    const generalTheme = await prisma.quizTheme.findUnique({ where: { name: "General" } });

    // Pre-load categories for mapping
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
    const errorDetails = [];

    for (const q of questions) {
      try {
        // Expected format: { category, subCategory?, dateListed, question, answer, externalId? }
        const { questionText, options } = parseScraperQuestion(q.question || q.questionText || "");
        const answerText = q.answer || q.answerText || "";

        if (!questionText || !answerText) {
          errors++;
          errorDetails.push({ question: q.question, error: "Missing question or answer text" });
          continue;
        }

        // Check for duplicate by text + source
        const externalId = q.externalId || null;
        if (externalId) {
          const existing = await prisma.quizQuestion.findUnique({ where: { externalId } });
          if (existing) {
            duplicatesSkipped++;
            continue;
          }
        } else {
          // Check by text similarity
          const existing = await prisma.quizQuestion.findFirst({
            where: {
              questionText: { equals: questionText },
              sourceId: source.id,
            },
          });
          if (existing) {
            duplicatesSkipped++;
            continue;
          }
        }

        // Map category name to ID
        const categoryName = (q.category || "News").toLowerCase();
        const categoryId = categoryNameMap[categoryName] || categoryNameMap["news"];

        // Map sub-category if provided
        const subCategoryName = q.subCategory ? q.subCategory.toLowerCase() : null;
        const subCategoryId = subCategoryName ? subCategoryNameMap[subCategoryName] || null : null;

        // Parse date
        let publishedDate = null;
        let year = null;
        if (q.dateListed || q.publishedDate) {
          const dateStr = q.dateListed || q.publishedDate;
          // Try DD/MM/YYYY or DD/M/YYYY format (used by scrapers)
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
            questionOriginal: q.question || q.questionText || null,
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
        errors++;
        errorDetails.push({ question: q.question || q.questionText, error: err.message });
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

    console.log(`[QuizDB] Import complete: ${imported} imported, ${duplicatesSkipped} duplicates skipped, ${errors} errors`);

    // Trigger post-import LLM classification (non-blocking)
    if (imported > 0) {
      const hasApiKey = !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY);
      if (hasApiKey) {
        console.log(`[QuizDB] Triggering post-import classification for ${imported} new questions...`);
        classifyNewlyImported(source.id, imported).catch((err) => {
          console.error("[QuizDB] Post-import classification error:", err.message);
        });
      } else {
        console.log("[QuizDB] No LLM API key configured - skipping post-import classification");
      }
    }

    return res.json({
      imported,
      duplicatesSkipped,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Limit error details
    });
  } catch (error) {
    console.error("[QuizDB] Error importing questions:", error);
    return res.status(500).json({ error: "Error importing questions" });
  }
}

// ─── Admin: Bulk update status ──────────────────────────────────────────────

async function bulkUpdateStatus(req, res) {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || !status) {
      return res.status(400).json({ error: "ids (array) and status are required" });
    }

    const validStatuses = ["UNVERIFIED", "VERIFIED", "FLAGGED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const result = await prisma.quizQuestion.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    console.log(`[QuizDB] Bulk status update: ${result.count} questions set to ${status}`);
    return res.json({ updated: result.count });
  } catch (error) {
    console.error("[QuizDB] Error updating status:", error);
    return res.status(500).json({ error: "Error updating status" });
  }
}

// ─── Public: Get lookup tables with counts ──────────────────────────────────

async function getCategories(req, res) {
  try {
    const categories = await prisma.quizCategory.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { questions: true } },
        subCategories: {
          orderBy: { displayOrder: "asc" },
          include: { _count: { select: { questions: true } } },
        },
      },
    });
    return res.json(categories);
  } catch (error) {
    console.error("[QuizDB] Error fetching categories:", error);
    return res.status(500).json({ error: "Error fetching categories" });
  }
}

async function getCountries(req, res) {
  try {
    const countries = await prisma.quizCountry.findMany({
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { questions: true } } },
    });
    return res.json(countries);
  } catch (error) {
    console.error("[QuizDB] Error fetching countries:", error);
    return res.status(500).json({ error: "Error fetching countries" });
  }
}

async function getThemes(req, res) {
  try {
    const themes = await prisma.quizTheme.findMany({
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { questions: true } } },
    });
    return res.json(themes);
  } catch (error) {
    console.error("[QuizDB] Error fetching themes:", error);
    return res.status(500).json({ error: "Error fetching themes" });
  }
}

async function getSources(req, res) {
  try {
    const sources = await prisma.quizSource.findMany({
      orderBy: { displayOrder: "asc" },
      include: { _count: { select: { questions: true } } },
    });
    return res.json(sources);
  } catch (error) {
    console.error("[QuizDB] Error fetching sources:", error);
    return res.status(500).json({ error: "Error fetching sources" });
  }
}

async function getSubCategories(req, res) {
  try {
    const { categoryId } = req.query;
    const where = categoryId ? { categoryId } : {};

    const subCategories = await prisma.quizSubCategory.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: {
        _count: { select: { questions: true } },
        category: { select: { id: true, name: true } },
      },
    });
    return res.json(subCategories);
  } catch (error) {
    console.error("[QuizDB] Error fetching sub-categories:", error);
    return res.status(500).json({ error: "Error fetching sub-categories" });
  }
}

// ─── Admin: CRUD for lookup tables ──────────────────────────────────────────

async function createCategory(req, res) {
  try {
    const { name, slug } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const finalSlug = slug || name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const category = await prisma.quizCategory.create({
      data: { name, slug: finalSlug },
    });
    console.log(`[QuizDB] Created category: ${name}`);
    return res.status(201).json(category);
  } catch (error) {
    console.error("[QuizDB] Error creating category:", error);
    return res.status(500).json({ error: "Error creating category" });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, displayOrder } = req.body;

    const category = await prisma.quizCategory.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(displayOrder !== undefined && { displayOrder }),
      },
    });
    return res.json(category);
  } catch (error) {
    console.error("[QuizDB] Error updating category:", error);
    return res.status(500).json({ error: "Error updating category" });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const count = await prisma.quizQuestion.count({ where: { categoryId: id } });
    if (count > 0) {
      return res.status(400).json({ error: `Cannot delete: ${count} question(s) use this category` });
    }

    await prisma.quizCategory.delete({ where: { id } });
    console.log(`[QuizDB] Deleted category: ${id}`);
    return res.status(204).send();
  } catch (error) {
    console.error("[QuizDB] Error deleting category:", error);
    return res.status(500).json({ error: "Error deleting category" });
  }
}

async function createTheme(req, res) {
  try {
    const { name, slug, monthsActive } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const theme = await prisma.quizTheme.create({
      data: {
        name,
        slug: finalSlug,
        monthsActive: monthsActive ? JSON.stringify(monthsActive) : null,
      },
    });
    console.log(`[QuizDB] Created theme: ${name}`);
    return res.status(201).json(theme);
  } catch (error) {
    console.error("[QuizDB] Error creating theme:", error);
    return res.status(500).json({ error: "Error creating theme" });
  }
}

async function deleteTheme(req, res) {
  try {
    const { id } = req.params;

    const count = await prisma.quizQuestion.count({ where: { themeId: id } });
    if (count > 0) {
      return res.status(400).json({ error: `Cannot delete: ${count} question(s) use this theme` });
    }

    await prisma.quizTheme.delete({ where: { id } });
    console.log(`[QuizDB] Deleted theme: ${id}`);
    return res.status(204).send();
  } catch (error) {
    console.error("[QuizDB] Error deleting theme:", error);
    return res.status(500).json({ error: "Error deleting theme" });
  }
}

// ─── Public: Submit feedback vote ──────────────────────────────────────────

async function submitFeedback(req, res) {
  try {
    const { id } = req.params;
    const { vote, fingerprint } = req.body;

    if (!vote || !["GOOD", "BAD"].includes(vote)) {
      return res.status(400).json({ error: "vote must be GOOD or BAD" });
    }
    if (!fingerprint) {
      return res.status(400).json({ error: "fingerprint is required" });
    }

    // Upsert: one vote per user per question
    await prisma.quizQuestionFeedback.upsert({
      where: {
        questionId_fingerprint: { questionId: id, fingerprint },
      },
      create: { questionId: id, vote, fingerprint },
      update: { vote },
    });

    // Count votes and check auto-flag threshold
    const counts = await prisma.quizQuestionFeedback.groupBy({
      by: ["vote"],
      where: { questionId: id },
      _count: true,
    });

    const good = counts.find((c) => c.vote === "GOOD")?._count || 0;
    const bad = counts.find((c) => c.vote === "BAD")?._count || 0;

    console.log(`[QuizDB-Feedback] Vote ${vote} for question ${id} (good: ${good}, bad: ${bad})`);

    // Auto-flag: 5+ bad votes AND bad:good ratio >= 5:1
    if (bad >= 5 && (good === 0 || bad / good >= 5)) {
      await prisma.quizQuestion.update({
        where: { id },
        data: { status: "FLAGGED" },
      });
      console.log(`[QuizDB-Feedback] Question ${id} auto-flagged (bad: ${bad}, good: ${good})`);
    }

    return res.json({ good, bad, userVote: vote });
  } catch (error) {
    console.error("[QuizDB-Feedback] Error submitting feedback:", error);
    return res.status(500).json({ error: "Error submitting feedback" });
  }
}

// ─── Public: Get batch feedback for multiple questions ─────────────────────

async function getBatchFeedback(req, res) {
  try {
    const { questionIds, fingerprint } = req.body;

    if (!questionIds || !Array.isArray(questionIds)) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    // Get all votes for these questions
    const allVotes = await prisma.quizQuestionFeedback.groupBy({
      by: ["questionId", "vote"],
      where: { questionId: { in: questionIds } },
      _count: true,
    });

    // Get user's own votes if fingerprint provided
    let userVotes = [];
    if (fingerprint) {
      userVotes = await prisma.quizQuestionFeedback.findMany({
        where: {
          questionId: { in: questionIds },
          fingerprint,
        },
        select: { questionId: true, vote: true },
      });
    }

    const userVoteMap = {};
    for (const v of userVotes) {
      userVoteMap[v.questionId] = v.vote;
    }

    // Build result map
    const result = {};
    for (const qId of questionIds) {
      result[qId] = { good: 0, bad: 0, userVote: userVoteMap[qId] || null };
    }
    for (const row of allVotes) {
      if (result[row.questionId]) {
        if (row.vote === "GOOD") result[row.questionId].good = row._count;
        if (row.vote === "BAD") result[row.questionId].bad = row._count;
      }
    }

    return res.json(result);
  } catch (error) {
    console.error("[QuizDB-Feedback] Error fetching batch feedback:", error);
    return res.status(500).json({ error: "Error fetching feedback" });
  }
}

// ─── Public: Lucky Dip - random question selection ─────────────────────────

async function luckyDip(req, res) {
  try {
    const {
      count = 10,
      categoryId,
      difficulty,
      countryId,
      themeId,
      questionType,
    } = req.query;

    const limit = Math.min(50, Math.max(1, parseInt(count)));

    const where = { status: { not: "FLAGGED" } };
    if (categoryId) where.categoryId = categoryId;
    if (difficulty) where.difficulty = difficulty;
    if (countryId) where.countryId = countryId;
    if (themeId) where.themeId = themeId;
    if (questionType) where.questionType = questionType;

    // Get total count for these filters
    const total = await prisma.quizQuestion.count({ where });

    if (total === 0) {
      return res.json({ questions: [], total: 0 });
    }

    // Select random IDs using skip with random offsets
    const randomOffsets = new Set();
    while (randomOffsets.size < Math.min(limit, total)) {
      randomOffsets.add(Math.floor(Math.random() * total));
    }

    const questions = [];
    for (const offset of randomOffsets) {
      const q = await prisma.quizQuestion.findFirst({
        where,
        skip: offset,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          subCategory: { select: { id: true, name: true, slug: true } },
          country: { select: { id: true, name: true, code: true } },
          theme: { select: { id: true, name: true, slug: true } },
          source: { select: { id: true, name: true, slug: true } },
        },
      });
      if (q) questions.push(q);
    }

    console.log(`[QuizDB] Lucky dip: ${questions.length} questions (requested ${limit}, pool ${total})`);
    return res.json({ questions, total });
  } catch (error) {
    console.error("[QuizDB] Error in lucky dip:", error);
    return res.status(500).json({ error: "Error generating lucky dip" });
  }
}

// ─── Public: Batch fetch questions by IDs ──────────────────────────────────

async function getQuestionsByIds(req, res) {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "ids array is required" });
    }

    const questions = await prisma.quizQuestion.findMany({
      where: { id: { in: ids } },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subCategory: { select: { id: true, name: true, slug: true } },
        country: { select: { id: true, name: true, code: true } },
        theme: { select: { id: true, name: true, slug: true } },
        source: { select: { id: true, name: true, slug: true } },
      },
    });

    // Preserve input order
    const questionMap = {};
    for (const q of questions) questionMap[q.id] = q;
    const ordered = ids.map((id) => questionMap[id]).filter(Boolean);

    return res.json(ordered);
  } catch (error) {
    console.error("[QuizDB] Error fetching questions by IDs:", error);
    return res.status(500).json({ error: "Error fetching questions" });
  }
}

module.exports = {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getStats,
  importQuestions,
  bulkUpdateStatus,
  getCategories,
  getCountries,
  getThemes,
  getSources,
  getSubCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createTheme,
  deleteTheme,
  submitFeedback,
  getBatchFeedback,
  luckyDip,
  getQuestionsByIds,
};
