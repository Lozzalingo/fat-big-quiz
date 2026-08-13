"use client";

import { adminFetch } from "@/utils/adminFetch";
import React, { useState, useEffect } from "react";

const ConfigPage = () => {
  const [settings, setSettings] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newSetting, setNewSetting] = useState({ category: "", key: "", value: "", description: "", isSecret: false });
  const [showNew, setShowNew] = useState(false);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  console.log("[ConfigAdmin] Component rendered");

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/app-settings`);
      const data = await res.json();
      setSettings(data.settings || {});
    } catch (error) {
      console.error("[ConfigAdmin] Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (service: string) => {
    try {
      const res = await adminFetch(`${API_BASE}/api/app-settings/test-${service}`, { method: "POST" });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [service]: data }));
    } catch (error) {
      console.error(`[ConfigAdmin] ${service} test error:`, error);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await adminFetch(`${API_BASE}/api/app-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      setEditingKey(null);
      fetchSettings();
    } catch (error) {
      console.error("[ConfigAdmin] Save error:", error);
    }
  };

  const createSetting = async () => {
    if (!newSetting.category || !newSetting.key) return;
    try {
      await adminFetch(`${API_BASE}/api/app-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSetting),
      });
      setShowNew(false);
      setNewSetting({ category: "", key: "", value: "", description: "", isSecret: false });
      fetchSettings();
    } catch (error) {
      console.error("[ConfigAdmin] Create error:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Configuration & Settings</h1>
          <button onClick={() => setShowNew(!showNew)} data-action="config_new"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">
            {showNew ? "Cancel" : "New Setting"}
          </button>
        </div>

        {showNew && (
          <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-2 gap-3">
            <input type="text" value={newSetting.category} onChange={e => setNewSetting(s => ({ ...s, category: e.target.value }))}
              placeholder="Category" className="px-3 py-2 border rounded-lg text-sm" />
            <input type="text" value={newSetting.key} onChange={e => setNewSetting(s => ({ ...s, key: e.target.value }))}
              placeholder="Key" className="px-3 py-2 border rounded-lg text-sm" />
            <input type="text" value={newSetting.value} onChange={e => setNewSetting(s => ({ ...s, value: e.target.value }))}
              placeholder="Value" className="px-3 py-2 border rounded-lg text-sm" />
            <input type="text" value={newSetting.description} onChange={e => setNewSetting(s => ({ ...s, description: e.target.value }))}
              placeholder="Description" className="px-3 py-2 border rounded-lg text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newSetting.isSecret} onChange={e => setNewSetting(s => ({ ...s, isSecret: e.target.checked }))} />
              Secret (masked)
            </label>
            <button onClick={createSetting} data-action="config_create" className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm">Create</button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {["stripe", "resend"].map(service => (
            <div key={service} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold capitalize mb-2">{service} Connection</h3>
              <button onClick={() => testConnection(service)} data-action={`config_test_${service}`}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm">Test</button>
              {testResults[service] && (
                <p className={`text-sm mt-2 ${testResults[service].success ? "text-green-500" : "text-red-500"}`}>
                  {testResults[service].success ? "Connected!" : testResults[service].error || "Failed"}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Stored Settings</h2>
          {loading ? <p>Loading...</p> : Object.keys(settings).length === 0 ? (
            <p className="text-gray-400">No settings configured yet</p>
          ) : (
            Object.entries(settings).map(([category, items]) => (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">{category}</h3>
                <div className="space-y-2">
                  {items.map((item: any) => (
                    <div key={item.key} className="flex justify-between items-center py-2 border-b gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm">{item.key}</span>
                        {item.description && <span className="text-xs text-gray-400 ml-2">- {item.description}</span>}
                      </div>
                      {editingKey === item.key ? (
                        <div className="flex gap-1">
                          <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
                            className="px-2 py-1 border rounded text-sm w-48" autoFocus />
                          <button onClick={() => saveSetting(item.key, editValue)} className="px-2 py-1 bg-green-500 text-white rounded text-xs">Save</button>
                          <button onClick={() => setEditingKey(null)} className="px-2 py-1 text-gray-400 text-xs">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate max-w-[200px] ${item.isSecret ? "text-gray-400 font-mono" : ""}`}>
                            {item.value || "-"}
                          </span>
                          <button onClick={() => { setEditingKey(item.key); setEditValue(item.value || ""); }}
                            data-action="config_edit" className="text-xs text-purple-500 hover:text-purple-700">Edit</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  );
};

export default ConfigPage;
