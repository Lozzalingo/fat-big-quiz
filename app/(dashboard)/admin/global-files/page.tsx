"use client";
import { DashboardSidebar } from "@/components";
import Link from "next/link";
import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { FaPlus, FaGripVertical, FaEdit, FaTrash, FaCheck, FaTimes } from "react-icons/fa";

interface GlobalFile {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function GlobalFilesPage() {
  const [files, setFiles] = useState<GlobalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files`
      );
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching global files:", error);
      toast.error("Failed to load global files");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const newFiles = [...files];
    const [draggedItem] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(dropIndex, 0, draggedItem);

    setFiles(newFiles);
    setDraggedIndex(null);

    // Save new order
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newFiles.map((f) => f.id) }),
        }
      );

      if (!response.ok) throw new Error("Failed to reorder");
      toast.success("Order saved");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Failed to save order");
      fetchFiles(); // Revert
    }
  };

  const handleToggleActive = async (file: GlobalFile) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${file.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !file.isActive }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === file.id ? { ...f, isActive: !f.isActive } : f
        )
      );
      toast.success(file.isActive ? "File deactivated" : "File activated");
    } catch (error: any) {
      console.error("Error toggling active:", error);
      toast.error(error.message || "Failed to update file");
    }
  };

  const handleDelete = async (file: GlobalFile) => {
    if (!confirm(`Delete "${file.title}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${file.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete");

      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast.success("File deleted");
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete file");
    }
  };

  return (
    <div className="bg-white flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-4 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-semibold">Bonus Download Files</h1>
            <p className="text-gray-500 mt-1">
              These files are included with every purchase download.
            </p>
          </div>
          <Link
            href="/admin/global-files/new"
            className="btn btn-primary flex items-center gap-2"
          >
            <FaPlus /> Add File
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">No bonus files yet.</p>
            <Link href="/admin/global-files/new" className="btn btn-primary">
              Add Your First File
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10"></th>
                  <th>Title</th>
                  <th>File</th>
                  <th className="text-center">Active</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr
                    key={file.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`hover:bg-gray-50 cursor-move ${
                      draggedIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <td className="text-gray-400">
                      <FaGripVertical />
                    </td>
                    <td>
                      <div className="font-medium">{file.title}</div>
                      {file.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {file.description}
                        </div>
                      )}
                    </td>
                    <td>
                      {file.fileName ? (
                        <span className="text-sm text-gray-600 truncate max-w-xs block">
                          {file.fileName}
                        </span>
                      ) : (
                        <span className="text-sm text-red-500">
                          No file uploaded
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleToggleActive(file)}
                        disabled={!file.fileName}
                        className={`btn btn-sm btn-circle ${
                          file.isActive
                            ? "btn-success"
                            : "btn-ghost border border-gray-300"
                        }`}
                        title={file.isActive ? "Active" : "Inactive"}
                      >
                        {file.isActive ? (
                          <FaCheck className="text-white" />
                        ) : (
                          <FaTimes className="text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/global-files/${file.id}`}
                          className="btn btn-sm btn-ghost"
                        >
                          <FaEdit />
                        </Link>
                        <button
                          onClick={() => handleDelete(file)}
                          className="btn btn-sm btn-ghost text-red-500"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">How it works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>- Active files are automatically added to every purchase download</li>
            <li>- Drag rows to reorder (files appear in this order after product files)</li>
            <li>- Toggle active/inactive without deleting files</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
