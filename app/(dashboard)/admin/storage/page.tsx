"use client";

import { adminFetch } from "@/utils/adminFetch";
import React, { useState, useEffect, useRef } from "react";

const StoragePage = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [folder, setFolder] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  console.log("[StorageAdmin] Component rendered");

  useEffect(() => { fetchFiles(); fetchStats(); }, [folder]);

  const fetchFiles = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/storage/files/${folder}`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error("[StorageAdmin] Error:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await adminFetch(`${API_BASE}/api/storage/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("[StorageAdmin] Stats error:", error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      await adminFetch(`${API_BASE}/api/storage/upload`, { method: "POST", body: formData });
      fetchFiles();
      fetchStats();
    } catch (error) {
      console.error("[StorageAdmin] Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      await adminFetch(`${API_BASE}/api/storage/file`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      fetchFiles();
      fetchStats();
    } catch (error) {
      console.error("[StorageAdmin] Delete error:", error);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">File Storage</h1>
        {stats && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <p className="text-sm text-gray-500">Files: {stats.totalFiles} | Size: {stats.totalSizeFormatted} | Provider: {stats.provider}</p>
          </div>
        )}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex gap-3 mb-4">
            <input type="text" value={folder} onChange={e => setFolder(e.target.value)} placeholder="Folder" className="flex-1 px-4 py-2 border rounded-lg" />
            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} data-action="storage_upload"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {files.map((file: any, i: number) => (
              <div key={i} className="border rounded-lg p-3">
                {file.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <img src={file.url} alt={file.filename} className="w-full h-32 object-cover rounded mb-2" />
                )}
                <p className="text-sm font-medium truncate">{file.filename}</p>
                <p className="text-xs text-gray-400">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : ""}</p>
                <button onClick={() => handleDelete(file.url)} data-action="storage_delete" className="text-red-500 hover:text-red-700 text-sm mt-1">Delete</button>
              </div>
            ))}
            {files.length === 0 && <p className="text-gray-400 col-span-3">No files found</p>}
          </div>
        </div>
    </div>
  );
};

export default StoragePage;
