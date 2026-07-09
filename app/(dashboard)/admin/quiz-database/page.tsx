"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiPlus, FiUpload, FiCheck, FiFlag, FiTrash2 } from "react-icons/fi";

const API = process.env.NEXT_PUBLIC_API_BASE_URL;

type Question = {
  id: string;
  questionText: string;
  answerText: string;
  difficulty: string;
  status: string;
  year: number | null;
  createdAt: string;
  category: { id: string; name: string };
  subCategory: { id: string; name: string } | null;
  source: { id: string; name: string };
  country: { id: string; name: string };
};

type Stats = {
  total: number;
  byStatus: Record<string, number>;
  bySource: { name: string; count: number }[];
};

type LookupItem = {
  id: string;
  name: string;
  _count?: { questions: number };
};

export default function QuizDatabaseAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categories, setCategories] = useState<LookupItem[]>([]);
  const [sources, setSources] = useState<LookupItem[]>([]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [catRes, srcRes, statsRes] = await Promise.all([
          fetch(`${API}/api/quiz-database/categories`),
          fetch(`${API}/api/quiz-database/sources`),
          fetch(`${API}/api/quiz-database/stats`),
        ]);
        setCategories(await catRes.json());
        setSources(await srcRes.json());
        setStats(await statsRes.json());
      } catch (error) {
        console.error("[QuizDB Admin] Error loading lookups:", error);
      }
    };
    loadLookups();
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "25");
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (categoryFilter) params.set("categoryId", categoryFilter);
      if (sourceFilter) params.set("sourceId", sourceFilter);

      const res = await fetch(`${API}/api/quiz-database?${params.toString()}`);
      const data = await res.json();
      setQuestions(data.questions || []);
      setTotalPages(data.pagination?.totalPages || 0);
      setTotal(data.pagination?.total || 0);
    } catch (error) {
      console.error("[QuizDB Admin] Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, sourceFilter]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === questions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(questions.map((q) => q.id)));
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selected.size === 0) return;
    try {
      const res = await fetch(`${API}/api/quiz-database/bulk-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), status }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Updated ${data.updated} question(s) to ${status}`);
        setSelected(new Set());
        fetchQuestions();
      }
    } catch (error) {
      console.error("[QuizDB Admin] Bulk update error:", error);
      toast.error("Failed to update status");
    }
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await fetch(`${API}/api/quiz-database/${id}`, { method: "DELETE" });
      toast.success("Question deleted");
      fetchQuestions();
    } catch (error) {
      console.error("[QuizDB Admin] Delete error:", error);
      toast.error("Failed to delete question");
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      VERIFIED: "bg-green-500/20 text-green-400",
      UNVERIFIED: "bg-yellow-500/20 text-yellow-400",
      FLAGGED: "bg-red-500/20 text-red-400",
    };
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || "bg-gray-600/20 text-gray-400"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quiz Database</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage quiz questions, import from scrapers, and review content
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/quiz-database/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FiPlus /> Add Question
          </Link>
          <Link
            href="/admin/quiz-database/import"
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <FiUpload /> Import
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Total Questions</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-400">
              {(stats.byStatus?.verified || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Verified</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold text-yellow-400">
              {(stats.byStatus?.unverified || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Unverified</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold text-red-400">
              {(stats.byStatus?.flagged || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">Flagged</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-2xl font-bold text-blue-400">
              {stats.bySource?.length || 0}
            </p>
            <p className="text-xs text-gray-400">Sources</p>
          </div>
        </div>
      )}

      {/* Filters and search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search questions..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="VERIFIED">Verified</option>
          <option value="FLAGGED">Flagged</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => {
            setSourceFilter(e.target.value);
            setPage(1);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="">All Sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 mb-4">
          <span className="text-sm text-gray-300">
            {selected.size} selected
          </span>
          <button
            onClick={() => bulkUpdateStatus("VERIFIED")}
            className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300"
          >
            <FiCheck /> Verify
          </button>
          <button
            onClick={() => bulkUpdateStatus("FLAGGED")}
            className="flex items-center gap-1 text-sm text-red-400 hover:text-red-300"
          >
            <FiFlag /> Flag
          </button>
          <button
            onClick={() => bulkUpdateStatus("UNVERIFIED")}
            className="flex items-center gap-1 text-sm text-yellow-400 hover:text-yellow-300"
          >
            Reset
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === questions.length && questions.length > 0}
                    onChange={selectAll}
                    className="checkbox checkbox-sm"
                  />
                </th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">Question</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">Category</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">Source</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">Status</th>
                <th className="px-3 py-3 text-left text-gray-400 font-medium">Year</th>
                <th className="px-3 py-3 text-right text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-400">
                    No questions found
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-gray-700/50 hover:bg-gray-700/30"
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="checkbox checkbox-sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-white max-w-md">
                      <Link
                        href={`/admin/quiz-database/${q.id}`}
                        className="hover:text-blue-400 transition-colors"
                      >
                        {q.questionText.length > 80
                          ? q.questionText.slice(0, 80) + "..."
                          : q.questionText}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                      {q.category.name}
                    </td>
                    <td className="px-3 py-3 text-gray-300 whitespace-nowrap">
                      {q.source.name}
                    </td>
                    <td className="px-3 py-3">{statusBadge(q.status)}</td>
                    <td className="px-3 py-3 text-gray-400">{q.year || "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/quiz-database/${q.id}`}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-400">
          {total.toLocaleString()} total question{total !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-700"
          >
            Prev
          </button>
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded text-sm disabled:opacity-40 hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
