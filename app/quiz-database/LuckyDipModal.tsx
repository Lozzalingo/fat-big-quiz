"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiShuffle } from "react-icons/fi";

type LookupItem = {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  _count?: { questions: number };
};

type LuckyDipModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (questions: any[]) => void;
  categories: LookupItem[];
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function LuckyDipModal({
  isOpen,
  onClose,
  onGenerate,
  categories,
}: LuckyDipModalProps) {
  const [count, setCount] = useState(10);
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("count", String(count));
      if (categoryId) params.set("categoryId", categoryId);
      if (difficulty) params.set("difficulty", difficulty);

      const res = await fetch(`${API}/api/quiz-database/lucky-dip?${params.toString()}`);
      const data = await res.json();

      if (data.questions && data.questions.length > 0) {
        console.log(`[QuizBuilder] Lucky dip: got ${data.questions.length} questions`);
        onGenerate(data.questions);
        onClose();
      } else {
        alert("No questions found matching those filters. Try broadening your criteria.");
      }
    } catch (error) {
      console.error("[QuizBuilder] Lucky dip error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-gray-900 border border-gray-700 rounded-xl z-50 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiShuffle size={20} className="text-yellow-400" />
                Lucky Dip
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Number of questions */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Number of questions
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={count}
                  onChange={(e) => setCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Category filter */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Category (optional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Any category</option>
                  {categories
                    .filter((c) => (c._count?.questions || 0) > 0)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c._count?.questions || 0})
                      </option>
                    ))}
                </select>
              </div>

              {/* Difficulty filter */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Difficulty (optional)
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Any difficulty</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full mt-6 px-4 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full" />
                  Generating...
                </>
              ) : (
                <>
                  <FiShuffle size={18} />
                  Generate Quiz
                </>
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
