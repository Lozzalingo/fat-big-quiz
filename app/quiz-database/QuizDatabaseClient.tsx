"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiList, FiShuffle, FiX, FiLock, FiLogIn } from "react-icons/fi";
import { useSession } from "next-auth/react";
import QuestionCard from "./QuestionCard";
import type { QuizQuestion as CardQuestion, FeedbackData } from "./QuestionCard";
import FilterBar from "./FilterBar";
import QuizReviewPanel from "./QuizReviewPanel";
import LuckyDipModal from "./LuckyDipModal";
import { useQuizBuilderStore, SelectedQuestion } from "./quizBuilderStore";
import { useFingerprint } from "./useFingerprint";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;
const PREVIEW_LIMIT = 5; // Number of questions visible for free users

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

// ─── Paywall CTA Component ─────────────────────────────────────────────────

function PaywallCTA({
  loggedIn,
  onSubscribe,
  loading,
}: {
  loggedIn: boolean;
  onSubscribe: () => void;
  loading: boolean;
}) {
  return (
    <div className="relative mt-6">
      {/* Gradient fade overlay */}
      <div className="absolute -top-24 left-0 right-0 h-24 bg-gradient-to-b from-transparent to-gray-950 z-10 pointer-events-none" />

      <div className="bg-gradient-to-b from-blue-900/30 to-gray-900/80 border border-blue-500/20 rounded-xl p-8 text-center relative z-20">
        <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiLock size={24} className="text-blue-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Unlock the Full Quiz Database
        </h3>
        <p className="text-gray-300 max-w-lg mx-auto mb-2">
          Access 59,000+ quiz questions, build custom quizzes, use Lucky Dip,
          and export to PDF or print.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Perfect for pub quiz hosts, teachers, and trivia enthusiasts.
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">£9.99</span>
            <span className="text-gray-400">/month</span>
          </div>

          {loggedIn ? (
            <button
              onClick={onSubscribe}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 text-lg"
            >
              {loading ? "Redirecting to checkout..." : "Subscribe Now"}
            </button>
          ) : (
            <a
              href="/login?callbackUrl=/quiz-database"
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors text-lg"
            >
              <FiLogIn size={20} />
              Log in to Subscribe
            </a>
          )}

          <ul className="text-sm text-gray-400 space-y-1 mt-2">
            <li>&#10003; 59,000+ questions across 26 categories</li>
            <li>&#10003; Quiz builder with export to PDF, print, clipboard</li>
            <li>&#10003; Lucky Dip random quiz generator</li>
            <li>&#10003; New questions added weekly</li>
            <li>&#10003; Cancel any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Blurred Question Card ─────────────────────────────────────────────────

function BlurredQuestionCard({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="bg-gray-800/70 border border-gray-700/50 rounded-lg overflow-hidden"
    >
      <div className="p-5 select-none">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium blur-sm">
            Category
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 blur-sm">
            Medium
          </span>
        </div>
        <p className="text-white text-base leading-relaxed mb-3 blur-sm">
          This is a preview of a quiz question that would be visible with a subscription to the quiz database.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="px-3 py-2 rounded-md text-sm bg-gray-700/50 text-gray-300 border border-gray-600/30 blur-sm"
            >
              Option {n}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center py-2">
          <span className="text-sm text-gray-500 flex items-center gap-1.5">
            <FiLock size={14} />
            Subscribe to view
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function QuizDatabaseClient() {
  const { data: session, status: sessionStatus } = useSession();
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
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  // Access control
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);

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

  // Check subscription access
  useEffect(() => {
    if (sessionStatus === "loading") return;

    const checkAccess = async () => {
      try {
        const res = await fetch("/api/subscribe/status");
        const data = await res.json();
        setHasAccess(data.hasAccess);
        console.log("[QuizDB] Access check:", data);
      } catch (error) {
        console.error("[QuizDB] Access check error:", error);
        setHasAccess(false);
      } finally {
        setAccessChecked(true);
      }
    };

    checkAccess();
  }, [sessionStatus]);

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

        const catData = await catRes.json();
        const subCatData = await subCatRes.json();
        const countryData = await countryRes.json();
        const themeData = await themeRes.json();
        const statsData = await statsRes.json();

        setCategories(Array.isArray(catData) ? catData : []);
        setSubCategories(Array.isArray(subCatData) ? subCatData : []);
        setCountries(Array.isArray(countryData) ? countryData : []);
        setThemes(Array.isArray(themeData) ? themeData : []);
        setStats(statsData?.total !== undefined ? statsData : null);
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

  // Load feedback when questions change (only for subscribers)
  useEffect(() => {
    if (questions.length === 0 || !fingerprint || !hasAccess) return;

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
  }, [questions, fingerprint, hasAccess]);

  // Handle voting
  const handleVote = async (questionId: string, vote: "GOOD" | "BAD") => {
    if (!fingerprint || !hasAccess) return;

    try {
      const res = await fetch(`${API}/api/quiz-database/${questionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote, fingerprint }),
      });
      const data = await res.json();

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
    if (!hasAccess) return;
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
        const existingIds = new Set(selectedQuestions.map((q) => q.id));
        const newOnes = mapped.filter((q) => !existingIds.has(q.id));
        setSelectedQuestions([...selectedQuestions, ...newOnes]);
      }
    } else {
      setSelectedQuestions(mapped);
    }
    setPanelOpen(true);
  };

  // Handle subscribe
  const handleSubscribe = async () => {
    setSubscribeLoading(true);
    try {
      const res = await fetch("/api/subscribe", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("[QuizDB] Subscribe error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSubscribeLoading(false);
    }
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
  const isLoggedIn = !!session?.user;

  // Split questions into visible and blurred
  const visibleQuestions = hasAccess ? questions : questions.slice(0, PREVIEW_LIMIT);
  const blurredCount = hasAccess ? 0 : Math.max(0, questions.length - PREVIEW_LIMIT);

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

          {/* Lucky Dip button - only for subscribers */}
          {hasAccess && (
            <button
              onClick={() => setLuckyDipOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/30 rounded-full font-medium transition-colors"
            >
              <FiShuffle size={18} />
              Lucky Dip
            </button>
          )}

          {/* Subscribe CTA in hero for non-subscribers */}
          {accessChecked && !hasAccess && (
            <div className="mt-4">
              {isLoggedIn ? (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-colors disabled:opacity-50"
                >
                  <FiLock size={16} />
                  {subscribeLoading ? "Redirecting..." : "Subscribe - £9.99/mo"}
                </button>
              ) : (
                <a
                  href="/login?callbackUrl=/quiz-database"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-colors"
                >
                  <FiLogIn size={16} />
                  Log in to Subscribe
                </a>
              )}
            </div>
          )}
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
              {/* Visible questions */}
              {visibleQuestions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  isSelected={isSelected(q.id)}
                  onToggleSelect={hasAccess ? handleToggleSelect : undefined}
                  feedbackData={feedbackMap[q.id]}
                  onVote={hasAccess ? handleVote : undefined}
                />
              ))}

              {/* Blurred preview questions */}
              {blurredCount > 0 && (
                <>
                  {[...Array(Math.min(blurredCount, 5))].map((_, idx) => (
                    <BlurredQuestionCard
                      key={`blurred-${idx}`}
                      index={PREVIEW_LIMIT + idx}
                    />
                  ))}

                  {/* Paywall CTA */}
                  <PaywallCTA
                    loggedIn={isLoggedIn}
                    onSubscribe={handleSubscribe}
                    loading={subscribeLoading}
                  />
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination - only for subscribers */}
        {hasAccess && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => fetchQuestions(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>

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

      {/* Floating quiz builder bar - only for subscribers */}
      {hasAccess && (
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
      )}

      {/* Review panel - only for subscribers */}
      {hasAccess && <QuizReviewPanel />}

      {/* Lucky dip modal - only for subscribers */}
      {hasAccess && (
        <LuckyDipModal
          isOpen={luckyDipOpen}
          onClose={() => setLuckyDipOpen(false)}
          onGenerate={handleLuckyDipGenerate}
          categories={categories}
        />
      )}
    </div>
  );
}
