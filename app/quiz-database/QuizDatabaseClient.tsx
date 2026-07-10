"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiList, FiShuffle, FiX } from "react-icons/fi";
import QuestionCard from "./QuestionCard";
import type { QuizQuestion as CardQuestion, FeedbackData } from "./QuestionCard";
import FilterBar from "./FilterBar";
import QuizReviewPanel from "./QuizReviewPanel";
import LuckyDipModal from "./LuckyDipModal";
import { useQuizBuilderStore, SelectedQuestion } from "./quizBuilderStore";
import { useFingerprint } from "./useFingerprint";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type QuizQuestion = {
  id: string;
  questionText: string;
  answerText: string;
  options: string | null;
  explanation: string | null;
  difficulty: string;
  questionType: string;
  status: string;
  year: number | null;
  publishedDate: string | null;
  category: { id: string; name: string; slug: string };
  subCategory: { id: string; name: string; slug: string } | null;
  country: { id: string; name: string; code: string };
  theme: { id: string; name: string; slug: string };
  source: { id: string; name: string; slug: string };
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type LookupItem = {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  _count?: { questions: number };
};

type QuestionTypeItem = {
  type: string;
  count: number;
};

type Stats = {
  total: number;
  byCategory: { name: string; id: string; count: number }[];
  bySource: { name: string; id: string; count: number }[];
  byDifficulty: Record<string, number>;
  byQuestionType: QuestionTypeItem[];
  byYear: { year: number; count: number }[];
};

type Filters = {
  categoryId: string;
  subCategoryId: string;
  countryId: string;
  themeId: string;
  questionType: string;
  difficulty: string;
  yearFrom: string;
  yearTo: string;
  search: string;
};

const emptyFilters: Filters = {
  categoryId: "",
  subCategoryId: "",
  countryId: "",
  themeId: "",
  questionType: "",
  difficulty: "",
  yearFrom: "",
  yearTo: "",
  search: "",
};

export default function QuizDatabaseClient() {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [luckyDipOpen, setLuckyDipOpen] = useState(false);

  // Feedback state
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FeedbackData>>({});
  const fingerprint = useFingerprint();

  // Quiz builder store
  const { selectedQuestions, toggleQuestion, setQuestions: setSelectedQuestions, setPanelOpen, isSelected } =
    useQuizBuilderStore();

  // Override body background for dark theme page
  useEffect(() => {
    const body = document.body;
    const original = body.style.cssText;
    body.style.background = "#030712";
    body.style.backgroundImage = "none";
    return () => {
      body.style.cssText = original;
    };
  }, []);

  // Lookup data
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [subCategories, setSubCategories] = useState<LookupItem[]>([]);
  const [countries, setCountries] = useState<LookupItem[]>([]);
  const [themes, setThemes] = useState<LookupItem[]>([]);

  // Load lookup data on mount
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, subCatRes, countryRes, themeRes, statsRes] =
          await Promise.all([
            fetch(`${API}/api/quiz-database/categories`),
            fetch(`${API}/api/quiz-database/sub-categories`),
            fetch(`${API}/api/quiz-database/countries`),
            fetch(`${API}/api/quiz-database/themes`),
            fetch(`${API}/api/quiz-database/stats`),
          ]);

        setCategories(await catRes.json());
        setSubCategories(await subCatRes.json());
        setCountries(await countryRes.json());
        setThemes(await themeRes.json());
        setStats(await statsRes.json());
      } catch (error) {
        console.error("[QuizDB] Error loading lookups:", error);
      }
    };

    loadLookups();
  }, []);

  // Fetch questions
  const fetchQuestions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");

        if (filters.categoryId) params.set("categoryId", filters.categoryId);
        if (filters.subCategoryId)
          params.set("subCategoryId", filters.subCategoryId);
        if (filters.countryId) params.set("countryId", filters.countryId);
        if (filters.themeId) params.set("themeId", filters.themeId);
        if (filters.questionType) params.set("questionType", filters.questionType);
        if (filters.difficulty) params.set("difficulty", filters.difficulty);
        if (filters.yearFrom) params.set("yearFrom", filters.yearFrom);
        if (filters.yearTo) params.set("yearTo", filters.yearTo);
        if (filters.search) params.set("search", filters.search);

        const res = await fetch(
          `${API}/api/quiz-database?${params.toString()}`
        );
        const data = await res.json();

        setQuestions(data.questions || []);
        setPagination(
          data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 }
        );
      } catch (error) {
        console.error("[QuizDB] Error fetching questions:", error);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Fetch on filter change
  useEffect(() => {
    fetchQuestions(1);
  }, [fetchQuestions]);

  // Load feedback when questions change
  useEffect(() => {
    if (questions.length === 0 || !fingerprint) return;

    const loadFeedback = async () => {
      try {
        const res = await fetch(`${API}/api/quiz-database/feedback/batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIds: questions.map((q) => q.id),
            fingerprint,
          }),
        });
        const data = await res.json();
        setFeedbackMap(data);
      } catch (error) {
        console.error("[QuizDB] Error loading feedback:", error);
      }
    };

    loadFeedback();
  }, [questions, fingerprint]);

  // Handle voting
  const handleVote = async (questionId: string, vote: "GOOD" | "BAD") => {
    if (!fingerprint) return;

    try {
      const res = await fetch(`${API}/api/quiz-database/${questionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote, fingerprint }),
      });
      const data = await res.json();

      // Update local feedback map
      setFeedbackMap((prev) => ({
        ...prev,
        [questionId]: data,
      }));
    } catch (error) {
      console.error("[QuizDB] Error submitting vote:", error);
    }
  };

  // Handle select/deselect
  const handleToggleSelect = (question: CardQuestion) => {
    const selected: SelectedQuestion = {
      id: question.id,
      questionText: question.questionText,
      answerText: question.answerText,
      options: question.options,
      difficulty: question.difficulty,
      questionType: question.questionType,
      category: { name: question.category.name },
    };
    toggleQuestion(selected);
  };

  // Handle lucky dip results
  const handleLuckyDipGenerate = (luckyQuestions: QuizQuestion[]) => {
    const mapped: SelectedQuestion[] = luckyQuestions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      answerText: q.answerText,
      options: q.options,
      difficulty: q.difficulty,
      questionType: q.questionType,
      category: { name: q.category.name },
    }));

    if (selectedQuestions.length > 0) {
      if (
        confirm(
          `You have ${selectedQuestions.length} questions selected. Replace them with the Lucky Dip results?`
        )
      ) {
        setSelectedQuestions(mapped);
      } else {
        // Add to existing
        const existingIds = new Set(selectedQuestions.map((q) => q.id));
        const newOnes = mapped.filter((q) => !existingIds.has(q.id));
        setSelectedQuestions([...selectedQuestions, ...newOnes]);
      }
    } else {
      setSelectedQuestions(mapped);
    }
    setPanelOpen(true);
  };

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setSearchInput("");
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="min-h-screen bg-gray-950 relative z-10">
      {/* Hero */}
      <div className="bg-gradient-to-b from-blue-900/40 to-gray-950 py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Quiz Questions Database
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
            Search thousands of quiz questions across hundreds of categories.
            Filter by topic, difficulty, country, theme, and more.
          </p>
          {stats && (
            <div className="flex flex-wrap justify-center gap-4 text-sm mb-6">
              <span className="bg-blue-500/20 text-blue-300 px-4 py-2 rounded-full font-medium">
                {stats.total.toLocaleString()} Questions
              </span>
              <span className="bg-purple-500/20 text-purple-300 px-4 py-2 rounded-full font-medium">
                {stats.byCategory?.length || 0} Categories
              </span>
              <span className="bg-green-500/20 text-green-300 px-4 py-2 rounded-full font-medium">
                {stats.byYear?.length || 0} Years
              </span>
            </div>
          )}

          {/* Lucky Dip button */}
          <button
            onClick={() => setLuckyDipOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-full font-medium transition-colors"
          >
            <FiShuffle size={18} />
            Lucky Dip
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-24">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-lg"
          />
        </div>

        {/* Filters */}
        <FilterBar
          filters={filters}
          categories={categories}
          subCategories={subCategories}
          countries={countries}
          themes={themes}
          stats={stats}
          onFilterChange={handleFilterChange}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        {/* Results info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-400 text-sm">
            {loading
              ? "Loading..."
              : `${pagination.total.toLocaleString()} question${pagination.total !== 1 ? "s" : ""} found`}
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Questions list */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800/50 rounded-lg p-6 animate-pulse"
              >
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No questions found</p>
            <p className="text-gray-500 text-sm">
              Try adjusting your filters or search term
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={pagination.page}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  isSelected={isSelected(q.id)}
                  onToggleSelect={handleToggleSelect}
                  feedbackData={feedbackMap[q.id]}
                  onVote={handleVote}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => fetchQuestions(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>

            {/* Page numbers */}
            {(() => {
              const pages: number[] = [];
              const current = pagination.page;
              const total = pagination.totalPages;

              for (let i = 1; i <= total; i++) {
                if (
                  i === 1 ||
                  i === total ||
                  (i >= current - 2 && i <= current + 2)
                ) {
                  pages.push(i);
                }
              }

              const result: React.ReactNode[] = [];
              let last = 0;
              for (const p of pages) {
                if (last && p - last > 1) {
                  result.push(
                    <span key={`gap-${p}`} className="text-gray-500 px-1">
                      ...
                    </span>
                  );
                }
                result.push(
                  <button
                    key={p}
                    onClick={() => fetchQuestions(p)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      p === current
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                );
                last = p;
              }
              return result;
            })()}

            <button
              onClick={() => fetchQuestions(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Floating quiz builder bar */}
      <AnimatePresence>
        {selectedQuestions.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700"
          >
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <FiList size={18} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    My Quiz
                    <span className="ml-2 text-blue-400">
                      {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPanelOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Review & Export
                </button>
                <button
                  onClick={() => useQuizBuilderStore.getState().clearAll()}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="Clear all"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review panel */}
      <QuizReviewPanel />

      {/* Lucky dip modal */}
      <LuckyDipModal
        isOpen={luckyDipOpen}
        onClose={() => setLuckyDipOpen(false)}
        onGenerate={handleLuckyDipGenerate}
        categories={categories}
      />
    </div>
  );
}
