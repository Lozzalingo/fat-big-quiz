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

interface FormInput {
  title: string;
  description: string;
}

const GlobalFileForm = ({ mode, fileId }: GlobalFileFormProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formInput, setFormInput] = useState<FormInput>({
    title: "",
    description: "",
  });
  const [fileName, setFileName] = useState<string>("");
  const [isActive, setIsActive] = useState(false);

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
          setFormInput({
            title: data.title || "",
            description: data.description || "",
          });
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormInput((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fileId) {
      if (!fileId) {
        toast.error("Please save the file entry first before uploading");
      }
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("uploadedFile", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${fileId}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const data = await response.json();
      setFileName(data.fileName);
      setIsActive(data.isActive);
      toast.success("File uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      if (event.target) event.target.value = "";
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (formInput.title.trim().length === 0) {
      toast.error("Title is required");
      return;
    }

    setIsLoading(true);

    const url = isEditMode
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files/${fileId}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/global-files`;

    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "create"}`);
      }

      const data = await response.json();
      toast.success(`File ${isEditMode ? "updated" : "created"} successfully`);

      if (!isEditMode) {
        // Redirect to edit page so user can upload the file
        router.push(`/admin/global-files/${data.id}`);
      }
    } catch (error: any) {
      console.error("Error saving:", error);
      toast.error(error.message || "Failed to save");
    } finally {
      setIsLoading(false);
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
              {/* Title Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Title:</span>
                </label>
                <input
                  type="text"
                  name="title"
                  className="input input-bordered w-full"
                  value={formInput.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Meet Laurence - Your Quiz Creator"
                />
              </div>

              {/* Description Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-medium">Description (optional):</span>
                </label>
                <textarea
                  name="description"
                  className="textarea textarea-bordered w-full h-24"
                  value={formInput.description}
                  onChange={handleInputChange}
                  placeholder="A short description of this bonus file..."
                />
              </div>

              {/* File Upload Section */}
              {isEditMode && (
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text font-medium">File:</span>
                  </label>

                  {fileName ? (
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <FaFile className="text-2xl text-primary" />
                      <div className="flex-1">
                        <p className="font-medium truncate">{fileName}</p>
                        <p className="text-sm text-gray-500">
                          Status: {isActive ? (
                            <span className="text-green-600">Active</span>
                          ) : (
                            <span className="text-gray-500">Inactive</span>
                          )}
                        </p>
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
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg,.zip"
                  />
                </div>
              )}

              {!isEditMode && (
                <div className="alert alert-info">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Save first to upload a file.</span>
                </div>
              )}

              {/* Active Toggle */}
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
                      {isActive ? "Active - included in all downloads" : "Inactive - not included in downloads"}
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
                disabled={isLoading}
              >
                {isEditMode ? "Update" : "Create"}
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
