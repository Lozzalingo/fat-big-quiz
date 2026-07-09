"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type LookupItem = {
  id: string;
  name: string;
  slug?: string;
  code?: string;
};

type QuestionData = {
  id?: string;
  questionText: string;
  questionOriginal?: string;
  answerText: string;
  answerOriginal?: string;
  options: string;
  explanation: string;
  difficulty: string;
  questionType: string;
  status: string;
  categoryId: string;
  subCategoryId: string;
  countryId: string;
  themeId: string;
  sourceId: string;
  sourceUrl: string;
  publishedDate: string;
  year: string;
  externalId: string;
};

const emptyQuestion: QuestionData = {
  questionText: "",
  answerText: "",
  options: "",
  explanation: "",
  difficulty: "MEDIUM",
  questionType: "MULTIPLE_CHOICE",
  status: "UNVERIFIED",
  categoryId: "",
  subCategoryId: "",
  countryId: "",
  themeId: "",
  sourceId: "",
  sourceUrl: "",
  publishedDate: "",
  year: "",
  externalId: "",
};

type QuestionFormProps = {
  questionId?: string;
};

export default function QuestionForm({ questionId }: QuestionFormProps) {
  const router = useRouter();
  const isEditing = !!questionId;

  const [form, setForm] = useState<QuestionData>(emptyQuestion);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [subCategories, setSubCategories] = useState<LookupItem[]>([]);
  const [countries, setCountries] = useState<LookupItem[]>([]);
  const [themes, setThemes] = useState<LookupItem[]>([]);
  const [sources, setSources] = useState<LookupItem[]>([]);

  // Load lookups
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, subCatRes, countryRes, themeRes, sourceRes] =
          await Promise.all([
            fetch(`${API}/api/quiz-database/categories`),
            fetch(`${API}/api/quiz-database/sub-categories`),
            fetch(`${API}/api/quiz-database/countries`),
            fetch(`${API}/api/quiz-database/themes`),
            fetch(`${API}/api/quiz-database/sources`),
          ]);

        setCategories(await catRes.json());
        setSubCategories(await subCatRes.json());
        setCountries(await countryRes.json());
        setThemes(await themeRes.json());
        setSources(await sourceRes.json());
      } catch (error) {
        console.error("[QuizDB Form] Error loading lookups:", error);
      }
    };
    loadLookups();
  }, []);

  // Load existing question for editing
  useEffect(() => {
    if (!questionId) return;

    const loadQuestion = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/quiz-database/${questionId}`);
        if (!res.ok) throw new Error("Question not found");
        const q = await res.json();

        setForm({
          id: q.id,
          questionText: q.questionText || "",
          questionOriginal: q.questionOriginal || "",
          answerText: q.answerText || "",
          answerOriginal: q.answerOriginal || "",
          options: q.options || "",
          explanation: q.explanation || "",
          difficulty: q.difficulty || "MEDIUM",
          questionType: q.questionType || "MULTIPLE_CHOICE",
          status: q.status || "UNVERIFIED",
          categoryId: q.categoryId || "",
          subCategoryId: q.subCategoryId || "",
          countryId: q.countryId || "",
          themeId: q.themeId || "",
          sourceId: q.sourceId || "",
          sourceUrl: q.sourceUrl || "",
          publishedDate: q.publishedDate
            ? new Date(q.publishedDate).toISOString().split("T")[0]
            : "",
          year: q.year ? String(q.year) : "",
          externalId: q.externalId || "",
        });
      } catch (error) {
        console.error("[QuizDB Form] Error loading question:", error);
        toast.error("Failed to load question");
      } finally {
        setLoading(false);
      }
    };
    loadQuestion();
  }, [questionId]);

  const handleChange = (
    field: keyof QuestionData,
    value: string
  ) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.questionText || !form.answerText || !form.categoryId || !form.countryId || !form.themeId || !form.sourceId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const body = {
        ...form,
        year: form.year ? parseInt(form.year) : null,
        publishedDate: form.publishedDate || null,
        subCategoryId: form.subCategoryId || null,
      };

      const url = isEditing
        ? `${API}/api/quiz-database/${questionId}`
        : `${API}/api/quiz-database`;

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success(isEditing ? "Question updated" : "Question created");
      router.push("/admin/quiz-database");
    } catch (error) {
      console.error("[QuizDB Form] Save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  // Filter sub-categories by selected category
  const filteredSubCategories = form.categoryId
    ? subCategories.filter(
        (sc: LookupItem & { categoryId?: string }) =>
          (sc as { categoryId?: string }).categoryId === form.categoryId
      )
    : subCategories;

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400">
        Loading question...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Question text */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Question Text <span className="text-red-400">*</span>
        </label>
        <textarea
          value={form.questionText}
          onChange={(e) => handleChange("questionText", e.target.value)}
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Enter the quiz question..."
          required
        />
      </div>

      {/* Answer */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Answer <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.answerText}
          onChange={(e) => handleChange("answerText", e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="The correct answer..."
          required
        />
      </div>

      {/* Options (JSON) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Options (JSON)
        </label>
        <textarea
          value={form.options}
          onChange={(e) => handleChange("options", e.target.value)}
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
          placeholder='[{"label":"A","text":"Option 1"},{"label":"B","text":"Option 2"}]'
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave empty for open-answer questions
        </p>
      </div>

      {/* Explanation */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Explanation
        </label>
        <textarea
          value={form.explanation}
          onChange={(e) => handleChange("explanation", e.target.value)}
          rows={2}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Optional explanation for the answer..."
        />
      </div>

      {/* Grid of selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Category <span className="text-red-400">*</span>
          </label>
          <select
            value={form.categoryId}
            onChange={(e) => {
              handleChange("categoryId", e.target.value);
              handleChange("subCategoryId", "");
            }}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Sub-category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Sub-category
          </label>
          <select
            value={form.subCategoryId}
            onChange={(e) => handleChange("subCategoryId", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">None</option>
            {filteredSubCategories.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.name}</option>
            ))}
          </select>
        </div>

        {/* Country */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Country <span className="text-red-400">*</span>
          </label>
          <select
            value={form.countryId}
            onChange={(e) => handleChange("countryId", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Theme */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Theme / Season <span className="text-red-400">*</span>
          </label>
          <select
            value={form.themeId}
            onChange={(e) => handleChange("themeId", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select theme</option>
            {themes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {/* Source */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Source <span className="text-red-400">*</span>
          </label>
          <select
            value={form.sourceId}
            onChange={(e) => handleChange("sourceId", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="">Select source</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Difficulty
          </label>
          <select
            value={form.difficulty}
            onChange={(e) => handleChange("difficulty", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Question Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Question Type
          </label>
          <select
            value={form.questionType}
            onChange={(e) => handleChange("questionType", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="OPEN_ANSWER">Open Answer</option>
          </select>
        </div>

        {/* Status */}
        {isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="UNVERIFIED">Unverified</option>
              <option value="VERIFIED">Verified</option>
              <option value="FLAGGED">Flagged</option>
            </select>
          </div>
        )}

        {/* Published Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Published Date
          </label>
          <input
            type="date"
            value={form.publishedDate}
            onChange={(e) => handleChange("publishedDate", e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Source URL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Source URL
        </label>
        <input
          type="url"
          value={form.sourceUrl}
          onChange={(e) => handleChange("sourceUrl", e.target.value)}
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="https://..."
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          {saving
            ? "Saving..."
            : isEditing
            ? "Update Question"
            : "Create Question"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/quiz-database")}
          className="text-gray-400 hover:text-white px-4 py-2.5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
