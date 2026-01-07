"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, Trash2, ArrowLeft } from "lucide-react";

interface BlogPostHeaderProps {
  mode: "create" | "edit";
  onPreviewToggle: () => void;
  previewMode: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export const BlogPostHeader: React.FC<BlogPostHeaderProps> = ({
  mode,
  onPreviewToggle,
  previewMode,
  onSubmit,
  isSubmitting,
  onDelete,
  isDeleting,
}) => {
  const router = useRouter();

  return (
    <div className="bg-white border-b p-6 sticky top-0 z-10 shadow-sm">
      <div className="flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <button onClick={() => router.push("/admin/blog-editor")} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-800">
            {mode === "create" ? "Create Blog Post" : "Edit Blog Post"}
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onPreviewToggle}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              previewMode ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Eye size={16} className="mr-2" />
            {previewMode ? "Edit" : "Preview"}
          </button>
          {mode === "edit" && onDelete && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium flex items-center disabled:opacity-50"
            >
              <Trash2 size={16} className="mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          )}
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center disabled:opacity-75"
          >
            <Save size={16} className="mr-2" />
            {isSubmitting ? (mode === "create" ? "Creating..." : "Saving...") : mode === "create" ? "Create Post" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};