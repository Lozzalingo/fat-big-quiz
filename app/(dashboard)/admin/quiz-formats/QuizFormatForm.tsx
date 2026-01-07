"use client";
import { DashboardSidebar } from "@/components";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { getQuizFormatExplainerUrl } from "@/utils/cdn";

interface QuizFormatFormProps {
  id?: string;
}

interface QuizFormatInput {
  name: string;
  displayName: string;
  description: string;
  displayOrder: number;
}

const QuizFormatForm = ({ id }: QuizFormatFormProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [formInput, setFormInput] = useState<QuizFormatInput>({
    name: "",
    displayName: "",
    description: "",
    displayOrder: 0,
  });
  const [explainerImages, setExplainerImages] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const isEditMode = !!id;

  useEffect(() => {
    if (isEditMode) {
      setIsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error(`Error: ${res.status}`);
          return res.json();
        })
        .then((data) => {
          setFormInput({
            name: data.name || "",
            displayName: data.displayName || "",
            description: data.description || "",
            displayOrder: data.displayOrder || 0,
          });
          if (data.explainerImages) {
            try {
              const images = JSON.parse(data.explainerImages);
              setExplainerImages(Array.isArray(images) ? images : []);
            } catch {
              setExplainerImages([]);
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching quiz format:", error);
          toast.error("Failed to load quiz format data");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditMode]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormInput((prev) => ({
      ...prev,
      [name]: name === "displayOrder" ? parseInt(value) || 0 : value,
    }));

    // Auto-generate slug from display name
    if (name === "displayName" && !isEditMode) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setFormInput((prev) => ({ ...prev, name: slug }));
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !id) {
      toast.error("Please save the quiz format first before uploading images");
      return;
    }

    setImageLoading(true);
    let uploadedCount = 0;
    let lastImages = explainerImages;

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("uploadedFile", file);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}/images`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to upload image");
        }

        const data = await response.json();
        lastImages = data.images;
        uploadedCount++;
      }

      setExplainerImages(lastImages);
      toast.success(`${uploadedCount} image${uploadedCount > 1 ? 's' : ''} uploaded successfully`);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(error.message || "Failed to upload image");
      // Still update with whatever was successfully uploaded
      if (uploadedCount > 0) {
        setExplainerImages(lastImages);
      }
    } finally {
      if (event.target) {
        event.target.value = "";
      }
      setImageLoading(false);
    }
  };

  const removeImage = async (index: number) => {
    if (!id) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}/images/${index}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove image");
      }

      const data = await response.json();
      setExplainerImages(data.images);
      toast.success("Image removed successfully");
    } catch (error: any) {
      console.error("Error removing image:", error);
      toast.error(error.message || "Failed to remove image");
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex || !id) return;

    const newImages = [...explainerImages];
    const [draggedItem] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedItem);

    // Optimistic update
    setExplainerImages(newImages);
    setDraggedIndex(null);

    // Save to server
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}/images/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: newImages }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reorder images");
      }
    } catch (error) {
      console.error("Error reordering images:", error);
      toast.error("Failed to save image order");
      // Revert on error
      if (id) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}`
        );
        const data = await response.json();
        if (data.explainerImages) {
          setExplainerImages(JSON.parse(data.explainerImages));
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (formInput.displayName.trim().length === 0) {
      toast.error("Display name cannot be empty");
      return;
    }

    if (formInput.name.trim().length === 0) {
      toast.error("Slug cannot be empty");
      return;
    }

    setIsLoading(true);

    const url = isEditMode
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats`;

    const method = isEditMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formInput),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? "update" : "create"} quiz format`);
      }

      const data = await response.json();
      toast.success(`Quiz format ${isEditMode ? "updated" : "created"} successfully`);

      if (!isEditMode) {
        // Redirect to edit page after creation so user can add images
        router.push(`/admin/quiz-formats/${data.id}`);
      }
    } catch (error: any) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} quiz format:`, error);
      toast.error(error.message || `Failed to ${isEditMode ? "update" : "create"} quiz format`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;

    if (!confirm("Are you sure you want to delete this quiz format? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats/${id}`,
        { method: "DELETE" }
      );

      if (response.status === 204) {
        toast.success("Quiz format deleted successfully");
        router.push("/admin/quiz-formats");
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete quiz format");
      }
    } catch (error: any) {
      console.error("Error deleting quiz format:", error);
      toast.error(error.message || "Failed to delete quiz format");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-4 overflow-auto flex flex-col gap-y-7">
        <h1 className="text-3xl font-semibold">
          {isEditMode ? "Edit Quiz Format" : "Add New Quiz Format"}
        </h1>

        {isLoading && !imageLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Display Name Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Display Name:</span>
                </label>
                <input
                  type="text"
                  name="displayName"
                  className="input input-bordered w-full"
                  value={formInput.displayName}
                  onChange={handleInputChange}
                  placeholder="e.g., Music Quiz"
                />
              </div>

              {/* Slug Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Slug (URL-friendly name):</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered w-full"
                  value={formInput.name}
                  onChange={handleInputChange}
                  placeholder="e.g., music-quiz"
                  disabled={isEditMode}
                />
                {isEditMode && (
                  <label className="label">
                    <span className="label-text-alt text-gray-500">Slug cannot be changed after creation</span>
                  </label>
                )}
              </div>

              {/* Display Order Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Display Order:</span>
                </label>
                <input
                  type="number"
                  name="displayOrder"
                  className="input input-bordered w-full"
                  value={formInput.displayOrder}
                  onChange={handleInputChange}
                  placeholder="0"
                />
              </div>

              {/* Description Field */}
              <div className="form-control w-full md:col-span-2">
                <label className="label">
                  <span className="label-text">Description:</span>
                </label>
                <textarea
                  name="description"
                  className="textarea textarea-bordered w-full h-32"
                  value={formInput.description}
                  onChange={handleInputChange}
                  placeholder="Describe what makes this quiz format unique..."
                />
              </div>

              {/* Explainer Images Section */}
              {isEditMode && (
                <div className="form-control w-full md:col-span-2">
                  <label className="label">
                    <span className="label-text">Explainer Images:</span>
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    These images will be shown after the main product image in product listings.
                    Drag to reorder.
                  </p>

                  <div className="flex flex-wrap gap-4 mb-4">
                    {explainerImages.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`relative group cursor-move ${
                          draggedIndex === index ? "opacity-50" : ""
                        }`}
                      >
                        <img
                          src={getQuizFormatExplainerUrl(image)}
                          alt={`Explainer ${index + 1}`}
                          className="h-24 w-24 object-cover rounded border-2 border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1">
                          {index + 1}
                        </div>
                      </div>
                    ))}

                    {/* Add Image Button */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="h-24 w-24 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                    >
                      {imageLoading ? (
                        <span className="loading loading-spinner loading-sm"></span>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                            />
                          </svg>
                          <span className="text-xs text-gray-500 mt-1">Add</span>
                        </>
                      )}
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleImageUpload}
                    accept="image/*"
                    multiple
                  />
                </div>
              )}

              {!isEditMode && (
                <div className="md:col-span-2">
                  <div className="alert alert-info">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Save the quiz format first to upload explainer images.</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-x-4 mt-6">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isEditMode ? "Update Quiz Format" : "Create Quiz Format"}
              </button>

              {isEditMode && (
                <button
                  type="button"
                  className="btn btn-error"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  Delete Quiz Format
                </button>
              )}

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => router.push("/admin/quiz-formats")}
              >
                Cancel
              </button>
            </div>

            {isEditMode && (
              <p className="text-error mt-4">
                Note: You cannot delete a quiz format that has products assigned to it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizFormatForm;
