"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiChevronUp, FiChevronDown, FiTrash2, FiCopy, FiPrinter, FiDownload } from "react-icons/fi";
import { useQuizBuilderStore, SelectedQuestion } from "./quizBuilderStore";

const questionTypeLabels: Record<string, string> = {
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  OPEN_ANSWER: "Open Answer",
  FILL_IN_THE_BLANKS: "Fill in the Blanks",
  NAME_ANY: "Name Any",
  ORDER_THESE: "Order These",
  HIGHER_OR_LOWER: "Higher or Lower",
  FINISH_THE_LYRIC: "Finish the Lyric",
  SPOT_THE_FAKE: "Spot the Fake",
  FAKE_NEWS: "Fake News",
  MISSING_WORDS: "Missing Words",
};

function formatQuizText(questions: SelectedQuestion[]): string {
  const lines: string[] = [];
  lines.push("=== QUIZ QUESTIONS ===");
  lines.push("");

  questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.questionText}`);
    if (q.options) {
      try {
        const opts = JSON.parse(q.options);
        opts.forEach((opt: { label: string; text: string }) => {
          lines.push(`   ${opt.label}) ${opt.text}`);
        });
      } catch { /* skip */ }
    }
    lines.push("");
  });

  lines.push("");
  lines.push("=== ANSWERS ===");
  lines.push("");

  questions.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.answerText}`);
  });

  return lines.join("\n");
}

export default function QuizReviewPanel() {
  const { selectedQuestions, panelOpen, setPanelOpen, removeQuestion, reorderQuestions, clearAll } =
    useQuizBuilderStore();
  const printRef = useRef<HTMLDivElement>(null);

  if (!panelOpen) return null;

  const handleCopyText = async () => {
    const text = formatQuizText(selectedQuestions);
    try {
      await navigator.clipboard.writeText(text);
      alert("Quiz copied to clipboard!");
    } catch {
      console.error("[QuizBuilder] Failed to copy to clipboard");
    }
  };

  const handlePrint = () => {
    const text = formatQuizText(selectedQuestions);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>My Quiz</title>
        <style>
          body { font-family: Georgia, serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; }
          h1 { text-align: centre; font-size: 24px; margin-bottom: 30px; }
          h2 { font-size: 18px; margin-top: 40px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          .question { margin-bottom: 16px; line-height: 1.6; }
          .q-num { font-weight: bold; }
          .options { margin-left: 20px; margin-top: 4px; }
          .option { margin-bottom: 2px; }
          .answers { page-break-before: always; }
          .answer { margin-bottom: 8px; line-height: 1.4; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>Quiz Questions</h1>
        <h2>Questions</h2>
        ${selectedQuestions
          .map((q, i) => {
            let optionsHtml = "";
            if (q.options) {
              try {
                const opts = JSON.parse(q.options);
                optionsHtml = `<div class="options">${opts
                  .map((o: { label: string; text: string }) => `<div class="option">${o.label}) ${o.text}</div>`)
                  .join("")}</div>`;
              } catch { /* skip */ }
            }
            return `<div class="question"><span class="q-num">${i + 1}.</span> ${q.questionText}${optionsHtml}</div>`;
          })
          .join("")}
        <div class="answers">
          <h2>Answers</h2>
          ${selectedQuestions
            .map((q, i) => `<div class="answer"><span class="q-num">${i + 1}.</span> ${q.answerText}</div>`)
            .join("")}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDownloadPdf = () => {
    // Use the print dialog with "Save as PDF" option
    handlePrint();
  };

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setPanelOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-gray-900 border-l border-gray-700 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">
                My Quiz
                <span className="ml-2 text-sm font-normal text-gray-400">
                  {selectedQuestions.length} question{selectedQuestions.length !== 1 ? "s" : ""}
                </span>
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Question list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2" ref={printRef}>
              {selectedQuestions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No questions selected yet.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Click the + button on any question to add it to your quiz.
                  </p>
                </div>
              ) : (
                selectedQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-gray-800/70 border border-gray-700/50 rounded-lg p-4 flex gap-3"
                  >
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <span className="text-xs font-bold text-gray-500 w-6 text-center">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => reorderQuestions(idx, Math.max(0, idx - 1))}
                        disabled={idx === 0}
                        className="p-1 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move up"
                      >
                        <FiChevronUp size={14} />
                      </button>
                      <button
                        onClick={() =>
                          reorderQuestions(idx, Math.min(selectedQuestions.length - 1, idx + 1))
                        }
                        disabled={idx === selectedQuestions.length - 1}
                        className="p-1 text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                        title="Move down"
                      >
                        <FiChevronDown size={14} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed line-clamp-2">
                        {q.questionText}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                          {q.category.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove from quiz"
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer with export actions */}
            {selectedQuestions.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-700 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleCopyText}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    <FiCopy size={16} />
                    Copy
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    <FiPrinter size={16} />
                    Print
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    <FiDownload size={16} />
                    PDF
                  </button>
                </div>
                <button
                  onClick={clearAll}
                  className="w-full text-sm text-gray-500 hover:text-red-400 transition-colors py-1"
                >
                  Clear all questions
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
