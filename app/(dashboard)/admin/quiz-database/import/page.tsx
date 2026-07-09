"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiUpload, FiCheck, FiAlertCircle } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Source = {
  id: string;
  name: string;
  slug: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunCount: number | null;
  _count?: { questions: number };
};

type Country = {
  id: string;
  name: string;
  code: string;
};

type ImportResult = {
  imported: number;
  duplicatesSkipped: number;
  errors: number;
  errorDetails: { question: string; error: string }[];
};

export default function ImportPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedSource, setSelectedSource] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("UK");
  const [jsonInput, setJsonInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [srcRes, countryRes] = await Promise.all([
          fetch(`${API}/api/quiz-database/sources`),
          fetch(`${API}/api/quiz-database/countries`),
        ]);
        setSources(await srcRes.json());
        setCountries(await countryRes.json());
      } catch (error) {
        console.error("[QuizDB Import] Error loading data:", error);
      }
    };
    loadData();
  }, []);

  // Parse and preview JSON as user types
  useEffect(() => {
    if (!jsonInput.trim()) {
      setPreviewCount(0);
      return;
    }
    try {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        setPreviewCount(parsed.length);
      } else {
        setPreviewCount(0);
      }
    } catch {
      setPreviewCount(0);
    }
  }, [jsonInput]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonInput(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedSource) {
      toast.error("Please select a source");
      return;
    }

    let questions;
    try {
      questions = JSON.parse(jsonInput);
      if (!Array.isArray(questions)) {
        toast.error("JSON must be an array of questions");
        return;
      }
    } catch {
      toast.error("Invalid JSON format");
      return;
    }

    // Find source slug
    const source = sources.find((s) => s.slug === selectedSource);
    if (!source) {
      toast.error("Invalid source");
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const res = await fetch(`${API}/api/quiz-database/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions,
          sourceSlug: selectedSource,
          countryCode: selectedCountry,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);
      toast.success(`Imported ${data.imported} question(s)`);

      // Refresh sources to update last run info
      const srcRes = await fetch(`${API}/api/quiz-database/sources`);
      setSources(await srcRes.json());
    } catch (error) {
      console.error("[QuizDB Import] Error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Import Questions</h1>
      <p className="text-gray-400 text-sm mb-6">
        Import quiz questions from scrapers. Paste JSON or upload a file.
      </p>

      {/* Source status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
        {sources.map((s) => (
          <div
            key={s.id}
            className={`bg-gray-800 rounded-lg p-4 border transition-colors cursor-pointer ${
              selectedSource === s.slug
                ? "border-blue-500"
                : "border-gray-700 hover:border-gray-600"
            }`}
            onClick={() => setSelectedSource(s.slug)}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-medium text-sm">{s.name}</h3>
              {s.lastRunStatus && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    s.lastRunStatus === "success"
                      ? "bg-green-500/20 text-green-400"
                      : s.lastRunStatus === "partial"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {s.lastRunStatus}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>{s._count?.questions || 0} questions total</p>
              {s.lastRunAt && (
                <p>
                  Last run:{" "}
                  {new Date(s.lastRunAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {s.lastRunCount !== null && s.lastRunCount !== undefined && (
                <p>Last imported: {s.lastRunCount}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Import form */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source select */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select source</option>
              {sources.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Country select */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500"
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Upload JSON File
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="file-input file-input-bordered file-input-sm w-full bg-gray-900 border-gray-700 text-gray-300"
          />
        </div>

        {/* JSON textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Or paste JSON
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={12}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-xs"
            placeholder={`[\n  {\n    "category": "Sports",\n    "dateListed": "07/07/2026",\n    "question": "Which team won? [A) Chelsea | B) Arsenal | C) Liverpool | D) Spurs]",\n    "answer": "Arsenal"\n  }\n]`}
          />
          {previewCount > 0 && (
            <p className="text-xs text-blue-400 mt-1">
              {previewCount} question{previewCount !== 1 ? "s" : ""} detected
            </p>
          )}
        </div>

        {/* Import button */}
        <button
          onClick={handleImport}
          disabled={importing || !selectedSource || previewCount === 0}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
        >
          <FiUpload />
          {importing ? "Importing..." : `Import ${previewCount} Question${previewCount !== 1 ? "s" : ""}`}
        </button>

        {/* Results */}
        {result && (
          <div className="mt-4 p-4 rounded-lg bg-gray-900 border border-gray-700 space-y-2">
            <h3 className="text-white font-medium">Import Results</h3>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <FiCheck /> {result.imported} imported
              </span>
              <span className="text-yellow-400">
                {result.duplicatesSkipped} duplicates skipped
              </span>
              {result.errors > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <FiAlertCircle /> {result.errors} errors
                </span>
              )}
            </div>
            {result.errorDetails && result.errorDetails.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-400 font-medium">Error details:</p>
                {result.errorDetails.map((e, i) => (
                  <p key={i} className="text-xs text-red-300">
                    {e.question?.slice(0, 60)}... - {e.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expected format help */}
      <div className="mt-6 bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-white font-medium mb-2 text-sm">Expected JSON Format</h3>
        <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
{`[
  {
    "category": "Sports",
    "subCategory": "Football",       // optional
    "dateListed": "07/07/2026",      // DD/MM/YYYY
    "question": "Which team won the Premier League? [A) Chelsea | B) Arsenal | C) Liverpool | D) Spurs]",
    "answer": "Arsenal",
    "externalId": "QSC-W12-003"      // optional, for duplicate detection
  }
]`}
        </pre>
      </div>
    </div>
  );
}
