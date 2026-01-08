"use client";
import { DashboardSidebar } from "@/components";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaUpload, FaFile, FaTrash } from "react-icons/fa";

interface GlobalFileFormProps {
  mode: "create" | "edit";
  fileId?: string;
}

const GlobalFileForm = ({ mode, fileId }: GlobalFileFormProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isEditMode = mode === "edit" && !!fileId;

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${fileId}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setTitle(data.title || "");
          setDescription(data.description || "");
          setFileName(data.fileName || "");
          setIsActive(data.isActive || false);
        })
        .catch((error) => {
          console.error("Error fetching file:", error);
          toast.error("Failed to load file data");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [fileId, isEditMode]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        setTitle(nameWithoutExt);
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!isEditMode && !selectedFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsLoading(true);

    try {
      let currentFileId = fileId;

      // For new files, first create the record
      if (!isEditMode) {
        const createResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
          }
        );

        if (!createResponse.ok) {
          throw new Error("Failed to create file record");
        }

        const createdFile = await createResponse.json();
        currentFileId = createdFile.id;
      } else {
        // Update existing record
        const updateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${fileId}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update file record");
        }
      }

      // Upload file if selected
      if (selectedFile && currentFileId) {
        setUploading(true);
        const formData = new FormData();
        formData.append("uploadedFile", selectedFile);

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${currentFileId}/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Failed to upload file");
        }

        const uploadedData = await uploadResponse.json();
        setFileName(uploadedData.fileName);
        setIsActive(uploadedData.isActive);
      }

      toast.success(isEditMode ? "File updated successfully" : "File created successfully");
      router.push("/admin/global-files");
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setIsLoading(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    if (!confirm("Delete this file? This cannot be undone.")) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${fileId}`,
        { method: "DELETE" }
      );

      if (response.status === 204) {
        toast.success("File deleted");
        router.push("/admin/global-files");
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!isEditMode || !fileName) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${fileId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !isActive }),
        }
      );

      if (!response.ok) throw new Error("Failed to update");

      setIsActive(!isActive);
      toast.success(isActive ? "File deactivated" : "File activated");
    } catch (error) {
      console.error("Error toggling active:", error);
      toast.error("Failed to update");
    }
  };

  return (
    <div className="bg-white flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-4 overflow-auto flex flex-col gap-y-7">
        <h1 className="text-3xl font-semibold">
          {isEditMode ? "Edit Bonus File" : "Add New Bonus File"}
        </h1>

        {isLoading && !uploading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6 max-w-2xl">
            <div className="space-y-6">
              {/* File Upload Section - Show first */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">File:</span>
                </label>

                {fileName || selectedFile ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <FaFile className="text-2xl text-primary" />
                    <div className="flex-1">
                      <p className="font-medium truncate">
                        {selectedFile ? selectedFile.name : fileName}
                      </p>
                      {isEditMode && fileName && (
                        <p className="text-sm text-gray-500">
                          Status:{" "}
                          {isActive ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-gray-500">Inactive</span>
                          )}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-sm btn-outline"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        "Replace"
                      )}
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  >
                    {uploading ? (
                      <span className="loading loading-spinner loading-lg"></span>
                    ) : (
                      <>
                        <FaUpload className="text-4xl text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Click to upload a file</p>
                        <p className="text-sm text-gray-400 mt-1">
                          PDF, Images, or ZIP (max 50MB)
                        </p>
                      </>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.png,.jpg,.jpeg,.zip"
                />
              </div>

              {/* Title Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Title:</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Meet Laurence - Your Quiz Creator"
                />
              </div>

              {/* Description Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Description (optional):</span>
                </label>
                <textarea
                  className="textarea textarea-bordered w-full h-24"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short description of this bonus file..."
                />
              </div>

              {/* Active Toggle - Only show in edit mode with a file */}
              {isEditMode && fileName && (
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-4">
                    <input
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={isActive}
                      onChange={handleToggleActive}
                    />
                    <span className="label-text">
                      {isActive
                        ? "Active - included in all downloads"
                        : "Inactive - not included in downloads"}
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-x-4 mt-8">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isLoading || uploading}
              >
                {isLoading || uploading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : isEditMode ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </button>

              {isEditMode && (
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.push("/admin/global-files")}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalFileForm;
