"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

type Option = {
  label: string;
  text: string;
};

type QuizQuestion = {
  id: string;
  questionText: string;
  answerText: string;
  options: string | null;
  explanation: string | null;
  difficulty: string;
  questionType: string;
  year: number | null;
  category: { name: string; slug: string };
  subCategory: { name: string; slug: string } | null;
  country: { name: string; code: string };
  theme: { name: string; slug: string };
  source: { name: string; slug: string };
};

type QuestionCardProps = {
  question: QuizQuestion;
  index: number;
};

const difficultyColours: Record<string, string> = {
  EASY: "bg-green-500/20 text-green-300",
  MEDIUM: "bg-yellow-500/20 text-yellow-300",
  HARD: "bg-red-500/20 text-red-300",
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

const questionTypeColours: Record<string, string> = {
  MULTIPLE_CHOICE: "bg-purple-600/20 text-purple-300",
  TRUE_FALSE: "bg-teal-600/20 text-teal-300",
  OPEN_ANSWER: "bg-orange-600/20 text-orange-300",
  FILL_IN_THE_BLANKS: "bg-amber-600/20 text-amber-300",
  NAME_ANY: "bg-lime-600/20 text-lime-300",
  ORDER_THESE: "bg-cyan-600/20 text-cyan-300",
  WHOS_AT_POSITION: "bg-sky-600/20 text-sky-300",
  WHAT_POSITION: "bg-sky-600/20 text-sky-300",
  MISSING_SLOT: "bg-amber-600/20 text-amber-300",
  TOP_OR_BOTTOM_HALF: "bg-indigo-600/20 text-indigo-300",
  WHATS_BETWEEN: "bg-indigo-600/20 text-indigo-300",
  HOW_FAR_APART: "bg-indigo-600/20 text-indigo-300",
  HIGHEST_RANKED: "bg-yellow-600/20 text-yellow-300",
  COMPLETE_THE_LIST: "bg-lime-600/20 text-lime-300",
  HIGHER_OR_LOWER: "bg-rose-600/20 text-rose-300",
  UP_OR_DOWN: "bg-rose-600/20 text-rose-300",
  WHICH_IS_HIGHER: "bg-rose-600/20 text-rose-300",
  WORTH_MORE: "bg-emerald-600/20 text-emerald-300",
  SPOT_THE_FAKE: "bg-red-600/20 text-red-300",
  SWAP: "bg-fuchsia-600/20 text-fuchsia-300",
  FINISH_THE_LYRIC: "bg-pink-600/20 text-pink-300",
  MOST_WEEKS_AT_NUMBER_ONE: "bg-pink-600/20 text-pink-300",
  MOST_STREAMS: "bg-pink-600/20 text-pink-300",
  MOVIE_TAGLINE: "bg-violet-600/20 text-violet-300",
  ROTTEN_TOMATOES_SCORE: "bg-red-600/20 text-red-300",
  NAME_THE_GAME: "bg-violet-600/20 text-violet-300",
  FAKE_NEWS: "bg-red-600/20 text-red-300",
  MISSING_WORDS: "bg-amber-600/20 text-amber-300",
  MATCH_THE_COMMENT: "bg-blue-600/20 text-blue-300",
  MOST_UPVOTES: "bg-orange-600/20 text-orange-300",
  BEST_PERFORMER: "bg-emerald-600/20 text-emerald-300",
  WHAT_PRICE: "bg-emerald-600/20 text-emerald-300",
  EXCHANGE_RATE: "bg-emerald-600/20 text-emerald-300",
  BIGGEST_GAIN_LOSS: "bg-emerald-600/20 text-emerald-300",
};

export default function QuestionCard({ question, index }: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  let parsedOptions: Option[] = [];
  if (question.options) {
    try {
      parsedOptions = JSON.parse(question.options);
    } catch {
      parsedOptions = [];
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="bg-gray-800/70 border border-gray-700/50 rounded-lg overflow-hidden hover:border-gray-600/50 transition-colors"
    >
      <div className="p-5">
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
            {question.category.name}
          </span>
          {question.subCategory && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-200">
              {question.subCategory.name}
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              difficultyColours[question.difficulty] || "bg-gray-600/20 text-gray-300"
            }`}
          >
            {question.difficulty.charAt(0) + question.difficulty.slice(1).toLowerCase()}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              questionTypeColours[question.questionType] || "bg-gray-600/20 text-gray-300"
            }`}
          >
            {questionTypeLabels[question.questionType] || question.questionType}
          </span>
          {question.year && (
            <span className="text-xs text-gray-500">{question.year}</span>
          )}
          {question.country.code !== "WORLD" && (
            <span className="text-xs text-gray-500">
              {question.country.name}
            </span>
          )}
        </div>

        {/* Question */}
        <p className="text-white text-base leading-relaxed mb-3">
          {question.questionText}
        </p>

        {/* Options */}
        {parsedOptions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            {parsedOptions.map((opt) => (
              <div
                key={opt.label}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  showAnswer && opt.text.trim().toLowerCase() === question.answerText.trim().toLowerCase()
                    ? "bg-green-500/20 text-green-300 border border-green-500/30"
                    : "bg-gray-700/50 text-gray-300 border border-gray-600/30"
                }`}
              >
                <span className="font-semibold mr-2 text-gray-400">
                  {opt.label})
                </span>
                {opt.text}
              </div>
            ))}
          </div>
        )}

        {/* Reveal answer button */}
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAnswer ? "Hide Answer" : "Show Answer"}
        </button>

        {/* Answer */}
        {showAnswer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-gray-700/50"
          >
            <p className="text-green-400 font-medium">
              <span className="text-gray-400 text-sm mr-2">Answer:</span>
              {question.answerText}
            </p>
            {question.explanation && (
              <p className="text-gray-400 text-sm mt-2">
                {question.explanation}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
