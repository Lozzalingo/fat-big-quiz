"use client";

import { adminFetch } from "@/utils/adminFetch";
import React, { useState, useEffect } from "react";

const LogsPage = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ level: "", source: "", search: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  console.log("[LogsAdmin] Component rendered");

  useEffect(() => { fetchLogs(); fetchStats(); }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (filters.level) params.set("level", filters.level);
      if (filters.source) params.set("source", filters.source);
      if (filters.search) params.set("search", filters.search);
      const res = await adminFetch(`${API_BASE}/api/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error("[LogsAdmin] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/logs/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("[LogsAdmin] Stats error:", error);
    }
  };

  const handleCleanup = async () => {
    if (!confirm("Delete logs older than 30 days?")) return;
    try {
      const res = await adminFetch(`${API_BASE}/api/logs/cleanup?days=30`, { method: "DELETE" });
      const data = await res.json();
      alert(`Deleted ${data.deleted} old logs`);
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error("[LogsAdmin] Cleanup error:", error);
    }
  };

  const getLevelColor = (level: string) => {
    const c: Record<string, string> = { DEBUG: "bg-gray-100 text-gray-600", INFO: "bg-blue-100 text-blue-700", WARNING: "bg-yellow-100 text-yellow-700", ERROR: "bg-red-100 text-red-700", CRITICAL: "bg-red-200 text-red-900" };
    return c[level] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Application Logs</h1>
          <button onClick={handleCleanup} data-action="logs_cleanup" className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Cleanup Old Logs</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"].map(level => (
            <div key={level} className="bg-white rounded-lg shadow p-3 text-center cursor-pointer hover:ring-2 hover:ring-purple-300"
              onClick={() => setFilters(f => ({ ...f, level: f.level === level ? "" : level }))}>
              <span className={`inline-block px-2 py-1 text-xs rounded-full ${getLevelColor(level)}`}>{level}</span>
              <p className="text-lg font-bold mt-1">{stats.stats?.[level] || 0}</p>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-3 mb-4">
            <input type="text" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && fetchLogs()} placeholder="Search logs..." className="flex-1 px-4 py-2 border rounded-lg" />
            <input type="text" value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
              placeholder="Source filter..." className="px-4 py-2 border rounded-lg w-40" />
          </div>
          {loading ? <p>Loading...</p> : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log: any) => (
                <div key={log.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getLevelColor(log.level)}`}>{log.level}</span>
                    <span className="text-xs text-gray-400">{log.source}</span>
                    <span className="text-xs text-gray-400 ml-auto">{new Date(log.timestamp).toLocaleString("en-GB")}</span>
                  </div>
                  <p className="text-sm">{log.message}</p>
                  {log.details && <pre className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded overflow-x-auto">{log.details}</pre>}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} data-action="logs_prev" className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} data-action="logs_next" className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
    </div>
  );
};

export default LogsPage;
