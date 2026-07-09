"use client";

import React, { useState, useMemo } from "react";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";

type LookupItem = {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  _count?: { questions: number };
  subCategories?: LookupItem[];
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

type QuestionTypeItem = {
  type: string;
  count: number;
};

type Stats = {
  total: number;
  byDifficulty: Record<string, number>;
  byQuestionType: QuestionTypeItem[];
  byYear: { year: number; count: number }[];
};

const questionTypeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  OPEN_ANSWER: "Open Answer",
  FILL_IN_THE_BLANKS: "Fill in the Blanks",
  NAME_ANY: "Name Any",
  ORDER_THESE: "Order These",
  WHOS_AT_POSITION: "Who's at Position",
  WHAT_POSITION: "What Position",
  MISSING_SLOT: "Missing Slot",
  TOP_OR_BOTTOM_HALF: "Top or Bottom Half",
  WHATS_BETWEEN: "What's Between",
  HOW_FAR_APART: "How Far Apart",
  HIGHEST_RANKED: "Highest Ranked",
  COMPLETE_THE_LIST: "Complete the List",
  HIGHER_OR_LOWER: "Higher or Lower",
  UP_OR_DOWN: "Up or Down",
  WHICH_IS_HIGHER: "Which is Higher",
  WORTH_MORE: "Worth More",
  SPOT_THE_FAKE: "Spot the Fake",
  SWAP: "Swap",
  FINISH_THE_LYRIC: "Finish the Lyric",
  MOST_WEEKS_AT_NUMBER_ONE: "Most Weeks at #1",
  MOST_STREAMS: "Most Streams",
  MOVIE_TAGLINE: "Movie Tagline",
  ROTTEN_TOMATOES_SCORE: "Rotten Tomatoes Score",
  NAME_THE_GAME: "Name the Game",
  FAKE_NEWS: "Fake News",
  MISSING_WORDS: "Missing Words",
  MATCH_THE_COMMENT: "Match the Comment",
  MOST_UPVOTES: "Most Upvotes",
  BEST_PERFORMER: "Best Performer",
  WHAT_PRICE: "What Price",
  EXCHANGE_RATE: "Exchange Rate",
  BIGGEST_GAIN_LOSS: "Biggest Gain / Loss",
};

const difficultyLabels: Record<string, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

type FilterBarProps = {
  filters: Filters;
  categories: LookupItem[];
  subCategories: LookupItem[];
  countries: LookupItem[];
  themes: LookupItem[];
  stats: Stats | null;
  onFilterChange: (key: keyof Filters, value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

export default function FilterBar({
  filters,
  categories,
  subCategories,
  countries,
  themes,
  stats,
  onFilterChange,
  onClear,
  hasActiveFilters,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  // Only show items that have questions
  const activeCategories = useMemo(
    () => categories.filter((c) => c._count && c._count.questions > 0),
    [categories]
  );

  // Filter sub-categories by selected category, then only those with questions
  const filteredSubCategories = useMemo(() => {
    const byCategory = filters.categoryId
      ? subCategories.filter(
          (sc: LookupItem & { categoryId?: string }) =>
            (sc as { categoryId?: string }).categoryId === filters.categoryId
        )
      : subCategories;
    return byCategory.filter((sc) => sc._count && sc._count.questions > 0);
  }, [subCategories, filters.categoryId]);

  const activeCountries = useMemo(
    () => countries.filter((c) => c._count && c._count.questions > 0),
    [countries]
  );

  const activeThemes = useMemo(
    () => themes.filter((t) => t._count && t._count.questions > 0),
    [themes]
  );

  // Question types from stats (only types with questions)
  const activeQuestionTypes = useMemo(
    () => stats?.byQuestionType || [],
    [stats]
  );

  // Difficulties from stats (only those with questions)
  const activeDifficulties = useMemo(() => {
    if (!stats?.byDifficulty) return [];
    return Object.entries(stats.byDifficulty)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({ key: key.toUpperCase(), count }));
  }, [stats]);

  // Years from stats (only years that have questions)
  const activeYears = useMemo(() => {
    if (!stats?.byYear) return [];
    return stats.byYear
      .map((y) => y.year)
      .filter((y): y is number => y !== null)
      .sort((a, b) => b - a);
  }, [stats]);

  const activeFilterCount = [
    filters.categoryId,
    filters.subCategoryId,
    filters.countryId,
    filters.themeId,
    filters.questionType,
    filters.difficulty,
    filters.yearFrom || filters.yearTo ? "year" : "",
  ].filter(Boolean).length;

  return (
    <div className="mb-6">
      {/* Toggle button for mobile */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full md:hidden bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-300 mb-2"
      >
        <span className="flex-1 text-left">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </span>
        {expanded ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {/* Filter grid - always visible on desktop, toggle on mobile */}
      <div
        className={`${
          expanded ? "block" : "hidden"
        } md:block bg-gray-800/50 border border-gray-700/50 rounded-lg p-4`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Category */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Category
            </label>
            <select
              value={filters.categoryId}
              onChange={(e) => {
                onFilterChange("categoryId", e.target.value);
                onFilterChange("subCategoryId", "");
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.questions})
                </option>
              ))}
            </select>
          </div>

          {/* Sub-category */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Sub-category
            </label>
            <select
              value={filters.subCategoryId}
              onChange={(e) =>
                onFilterChange("subCategoryId", e.target.value)
              }
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Sub-categories</option>
              {filteredSubCategories.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc._count?.questions})
                </option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Country
            </label>
            <select
              value={filters.countryId}
              onChange={(e) => onFilterChange("countryId", e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Countries</option>
              {activeCountries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c._count?.questions})
                </option>
              ))}
            </select>
          </div>

          {/* Question Type */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Question Type
            </label>
            <select
              value={filters.questionType}
              onChange={(e) => onFilterChange("questionType", e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {activeQuestionTypes.map((qt) => (
                <option key={qt.type} value={qt.type}>
                  {questionTypeLabels[qt.type] || qt.type} ({qt.count})
                </option>
              ))}
            </select>
          </div>

          {/* Theme */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Theme / Season
            </label>
            <select
              value={filters.themeId}
              onChange={(e) => onFilterChange("themeId", e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Themes</option>
              {activeThemes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t._count?.questions})
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Difficulty
            </label>
            <select
              value={filters.difficulty}
              onChange={(e) => onFilterChange("difficulty", e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Difficulties</option>
              {activeDifficulties.map((d) => (
                <option key={d.key} value={d.key}>
                  {difficultyLabels[d.key] || d.key} ({d.count})
                </option>
              ))}
            </select>
          </div>

          {/* Year range */}
          <div className="sm:col-span-2">
            <label className="block text-xs text-gray-400 mb-1 font-medium">
              Year Range
            </label>
            <div className="flex items-center gap-2">
              <select
                value={filters.yearFrom}
                onChange={(e) => onFilterChange("yearFrom", e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">From</option>
                {activeYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="text-gray-500">to</span>
              <select
                value={filters.yearTo}
                onChange={(e) => onFilterChange("yearTo", e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">To</option>
                {activeYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Clear button */}
        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <FiX className="text-xs" />
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
