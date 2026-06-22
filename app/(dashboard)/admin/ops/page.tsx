"use client";

import { adminFetch } from "@/utils/adminFetch";
import React, { useState, useEffect } from "react";

const OpsPage = () => {
  const [health, setHealth] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupResult, setCleanupResult] = useState("");
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  console.log("[OpsAdmin] Component rendered");

  useEffect(() => { fetchHealth(); fetchErrors(); fetchAlerts(); }, []);

  const fetchAlerts = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/ops/alerts`);
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("[OpsAdmin] Alerts fetch error:", error);
    }
  };

  const fetchHealth = async () => {
    try {
      console.log("[OpsAdmin] Fetching health status");
      const res = await adminFetch(`${API_BASE}/api/ops/detailed`);
      const data = await res.json();
      setHealth(data);
    } catch (error) {
      console.error("[OpsAdmin] Health fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchErrors = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/ops/errors?limit=10`);
      const data = await res.json();
      setErrors(data.errors || []);
    } catch (error) {
      console.error("[OpsAdmin] Errors fetch error:", error);
    }
  };

  const handleDockerCleanup = async () => {
    if (!confirm("Run Docker image prune?")) return;
    try {
      console.log("[OpsAdmin] Running Docker cleanup");
      const res = await adminFetch(`${API_BASE}/api/ops/docker-cleanup`, { method: "POST" });
      const data = await res.json();
      setCleanupResult(data.output || "Done");
    } catch (error) {
      console.error("[OpsAdmin] Docker cleanup error:", error);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "healthy") return "text-green-500";
    if (status === "warning") return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Operations & Health</h1>

        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map((alert: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg font-medium text-sm ${
                alert.level === 'critical' ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {alert.level === 'critical' ? '!! ' : '! '}{alert.message}
              </div>
            ))}
          </div>
        )}

        {loading ? <p>Loading...</p> : health && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Status</p>
                <p className={`text-xl font-bold capitalize ${getStatusColor(health.status)}`}>{health.status}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="text-xl font-bold">{health.uptimeFormatted}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Memory</p>
                <p className="text-xl font-bold">{health.memory?.usedPercent}%</p>
                <p className="text-xs text-gray-400">{health.memory?.used} / {health.memory?.total}</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-500">Disk</p>
                <p className="text-xl font-bold">{health.disk?.usedPercent}%</p>
                <p className="text-xs text-gray-400">{health.disk?.used} / {health.disk?.total}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Recent Errors</h2>
                {errors.length === 0 ? <p className="text-gray-400">No recent errors</p> : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {errors.map((err: any) => (
                      <div key={err.id} className="border-l-4 border-red-500 pl-3 py-1">
                        <p className="text-sm font-medium">{err.message}</p>
                        <p className="text-xs text-gray-400">{err.source} — {new Date(err.timestamp).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Docker</h2>
                <button onClick={handleDockerCleanup} data-action="ops_docker_cleanup" className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                  Run Docker Cleanup
                </button>
                {cleanupResult && <pre className="mt-3 text-xs bg-gray-100 p-3 rounded overflow-x-auto">{cleanupResult}</pre>}
              </div>
            </div>
          </>
        )}
    </div>
  );
};

export default OpsPage;
