/**
 * Question Classifier - LLM-powered classification for quiz questions.
 *
 * Sends each question to an LLM to determine:
 *   - Category (from predefined list)
 *   - Sub-category (from predefined list, optional)
 *   - Country (code from predefined list, default to origin/strongest association)
 *   - Theme/Season (from predefined list, optional)
 *   - Difficulty (EASY / MEDIUM / HARD)
 *
 * Retries up to MAX_RETRIES times if the LLM returns invalid/missing fields.
 * After MAX_RETRIES, marks the question status as FLAGGED for human review.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MAX_RETRIES = 4;
const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_PROVIDER = "gemini"; // "gemini" | "openai" | "deepseek"

// ─── Taxonomy loader ──────────────────────────────────────────────────────────

let taxonomyCache = null;

async function loadTaxonomy() {
  if (taxonomyCache) return taxonomyCache;

  const [categories, subCategories, countries, themes] = await Promise.all([
    prisma.quizCategory.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.quizSubCategory.findMany({ include: { category: true }, orderBy: { displayOrder: "asc" } }),
    prisma.quizCountry.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.quizTheme.findMany({ orderBy: { displayOrder: "asc" } }),
  ]);

  // Build lookup maps (name -> id, case-insensitive)
  const categoryMap = new Map();
  const subCategoryMap = new Map();
  const countryMap = new Map(); // code -> id
  const themeMap = new Map();

  for (const c of categories) {
    categoryMap.set(c.name.toLowerCase(), c);
    categoryMap.set(c.slug.toLowerCase(), c);
  }
  for (const sc of subCategories) {
    subCategoryMap.set(sc.name.toLowerCase(), sc);
    subCategoryMap.set(sc.slug.toLowerCase(), sc);
  }
  for (const co of countries) {
    countryMap.set(co.code.toLowerCase(), co);
    countryMap.set(co.name.toLowerCase(), co);
  }
  for (const t of themes) {
    themeMap.set(t.name.toLowerCase(), t);
    themeMap.set(t.slug.toLowerCase(), t);
  }

  // Build category -> sub-categories lookup for the prompt
  const catSubMap = {};
  for (const c of categories) {
    catSubMap[c.name] = subCategories
      .filter((sc) => sc.categoryId === c.id)
      .map((sc) => sc.name);
  }

  taxonomyCache = {
    categories,
    subCategories,
    countries,
    themes,
    categoryMap,
    subCategoryMap,
    countryMap,
    themeMap,
    catSubMap,
  };

  return taxonomyCache;
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(taxonomy) {
  const { categories, countries, themes, catSubMap } = taxonomy;

  let prompt = `You are a quiz question classifier. Given a quiz question and its answer, classify it into the correct category, sub-category, country, theme, and difficulty.

RULES:
- Category: Pick the BEST match from the list below. Every question MUST have a category.
- Sub-category: Pick from the sub-categories listed under the chosen category. Use null if none fit.
- Country: Use the country code of the question's origin or strongest association. Default to WORLD if truly global.
- Theme: Pick a seasonal/event theme if applicable. Use null for general questions.
- Difficulty: EASY (common knowledge), MEDIUM (requires some knowledge), HARD (specialist/obscure).

CATEGORIES AND SUB-CATEGORIES:
`;

  for (const cat of categories) {
    const subs = catSubMap[cat.name];
    if (subs && subs.length > 0) {
      prompt += `- ${cat.name}: ${subs.join(", ")}\n`;
    } else {
      prompt += `- ${cat.name}\n`;
    }
  }

  prompt += `\nCOUNTRY CODES:\n`;
  for (const co of countries) {
    prompt += `- ${co.code} (${co.name})\n`;
  }

  prompt += `\nTHEMES (use null if none apply):\n`;
  prompt += themes.map((t) => t.name).join(", ");

  prompt += `\n\nRespond with ONLY valid JSON, no markdown, no explanation:
{"category": "ExactCategoryName", "subCategory": "ExactSubCategoryName" or null, "country": "CODE", "theme": "ExactThemeName" or null, "difficulty": "EASY" or "MEDIUM" or "HARD"}`;

  return prompt;
}

function buildRetryPrompt(errors, taxonomy) {
  let prompt = `Your previous classification had errors. Please fix ONLY the invalid fields listed below.

ERRORS:\n`;

  for (const err of errors) {
    prompt += `- ${err}\n`;
  }

  prompt += `\nRemember: you MUST choose from the predefined lists. Here they are again:\n\n`;

  // Include relevant lists based on which fields failed
  const { categories, countries, themes, catSubMap } = taxonomy;

  prompt += `CATEGORIES: ${categories.map((c) => c.name).join(", ")}\n`;
  prompt += `COUNTRY CODES: ${countries.map((c) => c.code).join(", ")}\n`;
  prompt += `THEMES: ${themes.map((t) => t.name).join(", ")}, or null\n`;
  prompt += `DIFFICULTY: EASY, MEDIUM, HARD\n`;

  prompt += `\nRespond with ONLY valid JSON:
{"category": "...", "subCategory": "..." or null, "country": "CODE", "theme": "..." or null, "difficulty": "EASY|MEDIUM|HARD"}`;

  return prompt;
}

// ─── LLM API call ─────────────────────────────────────────────────────────────

async function callLLM(messages, provider = DEFAULT_PROVIDER, model = DEFAULT_MODEL) {
  let url, headers, body;

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not set");

    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    headers = { "Content-Type": "application/json" };

    // Convert messages to Gemini format
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role !== "system");

    body = {
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      contents: userMsgs.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 200,
        responseMimeType: "application/json",
      },
    };
  } else if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    url = "https://api.openai.com/v1/chat/completions";
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = {
      model: model || "gpt-4.1-nano",
      messages,
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    };
  } else if (provider === "deepseek") {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");

    url = "https://api.deepseek.com/chat/completions";
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = {
      model: model || "deepseek-chat",
      messages,
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: "json_object" },
    };
  } else {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error (${response.status}): ${text.substring(0, 300)}`);
  }

  const data = await response.json();

  // Extract text from response
  let text;
  if (provider === "gemini") {
    text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } else {
    text = data.choices?.[0]?.message?.content || "";
  }

  // Parse JSON (strip markdown code fences if present)
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Failed to parse LLM response as JSON: ${text.substring(0, 200)}`);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateClassification(result, taxonomy) {
  const errors = [];
  const resolved = {};

  // Category (required)
  if (!result.category) {
    errors.push("category is missing - you must choose one");
  } else {
    const cat = taxonomy.categoryMap.get(result.category.toLowerCase());
    if (!cat) {
      errors.push(
        `category "${result.category}" is not in our list. Choose from: ${taxonomy.categories.map((c) => c.name).join(", ")}`
      );
    } else {
      resolved.categoryId = cat.id;
      resolved.categoryName = cat.name;
    }
  }

  // Sub-category (optional)
  if (result.subCategory && result.subCategory !== "null") {
    const sub = taxonomy.subCategoryMap.get(result.subCategory.toLowerCase());
    if (!sub) {
      // Not a hard error, just skip it
      errors.push(
        `subCategory "${result.subCategory}" is not in our list. Use null or pick from the sub-categories under your chosen category.`
      );
    } else {
      // Verify sub-category belongs to the chosen category
      if (resolved.categoryId && sub.categoryId !== resolved.categoryId) {
        errors.push(
          `subCategory "${result.subCategory}" does not belong to category "${resolved.categoryName}". Pick a sub-category from that category, or use null.`
        );
      } else {
        resolved.subCategoryId = sub.id;
      }
    }
  }

  // Country (required)
  if (!result.country) {
    errors.push("country is missing - use a country code like UK, US, WORLD");
  } else {
    const co = taxonomy.countryMap.get(result.country.toLowerCase());
    if (!co) {
      errors.push(
        `country "${result.country}" is not valid. Choose from: ${taxonomy.countries.map((c) => c.code).join(", ")}`
      );
    } else {
      resolved.countryId = co.id;
    }
  }

  // Theme (optional)
  if (result.theme && result.theme !== "null") {
    const th = taxonomy.themeMap.get(result.theme.toLowerCase());
    if (!th) {
      // Not a hard error - default to null
      errors.push(
        `theme "${result.theme}" is not in our list. Use null or pick from the themes list.`
      );
    } else {
      resolved.themeId = th.id;
    }
  }

  // Difficulty (required)
  const validDifficulties = ["EASY", "MEDIUM", "HARD"];
  if (!result.difficulty) {
    errors.push("difficulty is missing - choose EASY, MEDIUM, or HARD");
  } else if (!validDifficulties.includes(result.difficulty.toUpperCase())) {
    errors.push(
      `difficulty "${result.difficulty}" is not valid. Choose from: EASY, MEDIUM, HARD`
    );
  } else {
    resolved.difficulty = result.difficulty.toUpperCase();
  }

  return { errors, resolved };
}

// ─── Classify a single question ───────────────────────────────────────────────

async function classifyQuestion(question, taxonomy, provider, model) {
  const systemPrompt = buildSystemPrompt(taxonomy);
  const userMessage = `Question: ${question.questionText}\nAnswer: ${question.answerText}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  let lastResult = null;
  let resolved = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await callLLM(messages, provider, model);
      lastResult = result;

      const validation = validateClassification(result, taxonomy);

      if (validation.errors.length === 0) {
        // All fields valid
        return { success: true, resolved: validation.resolved, attempts: attempt };
      }

      if (attempt < MAX_RETRIES) {
        // Add the failed response and retry prompt to the conversation
        messages.push({ role: "assistant", content: JSON.stringify(result) });
        messages.push({
          role: "user",
          content: buildRetryPrompt(validation.errors, taxonomy),
        });

        console.log(
          `[Classifier] Retry ${attempt}/${MAX_RETRIES} for question "${question.questionText.substring(0, 50)}..." - errors: ${validation.errors.join("; ")}`
        );
      } else {
        // Final attempt still has errors - use what we have, flag the rest
        resolved = validation.resolved;
      }
    } catch (err) {
      console.error(
        `[Classifier] Attempt ${attempt}/${MAX_RETRIES} failed for question "${question.questionText.substring(0, 50)}...": ${err.message}`
      );

      if (attempt === MAX_RETRIES) {
        return { success: false, resolved: null, attempts: attempt, error: err.message };
      }

      // Wait briefly before retry on API error
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Partial success - some fields resolved but not all
  return { success: false, resolved, attempts: MAX_RETRIES, error: "Max retries reached with validation errors" };
}

// ─── Batch classify questions ─────────────────────────────────────────────────

async function classifyQuestions({
  where = {},
  limit = 100,
  provider = DEFAULT_PROVIDER,
  model = DEFAULT_MODEL,
  dryRun = false,
  concurrency = 5,
} = {}) {
  const taxonomy = await loadTaxonomy();
  const generalTheme = taxonomy.themes.find((t) => t.name === "General");

  // Fetch questions to classify
  const questions = await prisma.quizQuestion.findMany({
    where,
    take: limit,
    select: {
      id: true,
      questionText: true,
      answerText: true,
      options: true,
      categoryId: true,
      subCategoryId: true,
      countryId: true,
      themeId: true,
      difficulty: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`[Classifier] Classifying ${questions.length} questions with ${provider}/${model} (concurrency: ${concurrency})...`);

  const stats = {
    total: questions.length,
    classified: 0,
    flagged: 0,
    errors: 0,
    skipped: 0,
    changes: { category: 0, subCategory: 0, country: 0, theme: 0, difficulty: 0 },
    totalAttempts: 0,
  };

  // Process in batches for concurrency
  for (let i = 0; i < questions.length; i += concurrency) {
    const batch = questions.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((q) => classifyQuestion(q, taxonomy, provider, model))
    );

    for (let j = 0; j < results.length; j++) {
      const question = batch[j];
      const result = results[j];

      if (result.status === "rejected") {
        console.error(`[Classifier] Error for question ${question.id}: ${result.reason}`);
        stats.errors++;
        continue;
      }

      const { success, resolved, attempts, error } = result.value;
      stats.totalAttempts += attempts;

      if (!resolved) {
        // Complete failure - flag for review
        if (!dryRun) {
          await prisma.quizQuestion.update({
            where: { id: question.id },
            data: { status: "FLAGGED" },
          });
        }
        console.log(`[Classifier] FLAGGED (no valid fields) question ${question.id}: ${error}`);
        stats.flagged++;
        continue;
      }

      // Build update data
      const updateData = {};
      let hasChanges = false;

      if (resolved.categoryId && resolved.categoryId !== question.categoryId) {
        updateData.categoryId = resolved.categoryId;
        stats.changes.category++;
        hasChanges = true;
      }

      if (resolved.subCategoryId !== undefined && resolved.subCategoryId !== question.subCategoryId) {
        updateData.subCategoryId = resolved.subCategoryId;
        stats.changes.subCategory++;
        hasChanges = true;
      }

      if (resolved.countryId && resolved.countryId !== question.countryId) {
        updateData.countryId = resolved.countryId;
        stats.changes.country++;
        hasChanges = true;
      }

      if (resolved.themeId !== undefined && resolved.themeId !== question.themeId) {
        updateData.themeId = resolved.themeId;
        stats.changes.theme++;
        hasChanges = true;
      } else if (!resolved.themeId && generalTheme) {
        // Default to General theme if LLM returned null
        if (question.themeId !== generalTheme.id) {
          updateData.themeId = generalTheme.id;
        }
      }

      if (resolved.difficulty && resolved.difficulty !== question.difficulty) {
        updateData.difficulty = resolved.difficulty;
        stats.changes.difficulty++;
        hasChanges = true;
      }

      if (!success) {
        // Partial classification - apply what we have but flag for review
        updateData.status = "FLAGGED";
        stats.flagged++;
      } else {
        // Full classification - mark as verified
        if (question.status === "UNVERIFIED") {
          updateData.status = "VERIFIED";
        }
        stats.classified++;
      }

      if (hasChanges || updateData.status) {
        if (!dryRun) {
          await prisma.quizQuestion.update({
            where: { id: question.id },
            data: updateData,
          });
        }
      } else {
        stats.skipped++;
      }
    }

    // Progress log
    const processed = Math.min(i + concurrency, questions.length);
    if (processed % 50 === 0 || processed === questions.length) {
      console.log(
        `[Classifier] Progress: ${processed}/${questions.length} (classified: ${stats.classified}, flagged: ${stats.flagged}, errors: ${stats.errors})`
      );
    }

    // Rate limit pause between batches (avoid API throttling)
    if (i + concurrency < questions.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`[Classifier] Complete:`, stats);
  return stats;
}

// ─── Post-import classifier (called after scraper import) ─────────────────────

async function classifyNewlyImported(sourceId, count, provider, model) {
  console.log(`[Classifier] Classifying ${count} newly imported questions from source ${sourceId}...`);

  return classifyQuestions({
    where: {
      sourceId,
      status: "UNVERIFIED",
    },
    limit: count,
    provider,
    model,
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  classifyQuestion,
  classifyQuestions,
  classifyNewlyImported,
  loadTaxonomy,
  validateClassification,
  MAX_RETRIES,
};
