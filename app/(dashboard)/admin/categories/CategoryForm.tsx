"use client";
import { DashboardSidebar } from "@/components";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { convertCategoryNameToURLFriendly } from "../../../../utils/categoryFormatting";
import { getCategoryImageUrl } from "@/utils/cdn";

interface CategoryFormProps {
  id?: string; // Optional id for edit mode
}

const CategoryForm = ({ id }: CategoryFormProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultType = searchParams.get('type') || "PRODUCT";
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [categoryInput, setCategoryInput] = useState({
    name: "",
    type: defaultType,
    metaTitle: "",
    metaDescription: "",
    coverImage: ""
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const isEditMode = !!id;
  
  const placeholderImage = "/placeholder-image.jpg"; // Default placeholder image path

  useEffect(() => {
    // If in edit mode, fetch the category data
    if (isEditMode) {
      setIsLoading(true);
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setCategoryInput({
            name: data.name || "",
            type: data.type || defaultType,
            metaTitle: data.metaTitle || "",
            metaDescription: data.metaDescription || "",
            coverImage: data.coverImage || ""
          });
          
          // Set image preview if available
          if (data.coverImage) {
            setImagePreview(getCategoryImageUrl(data.coverImage));
          }
        })
        .catch((error) => {
          console.error("Error fetching category:", error);
          toast.error("Failed to load category data");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, isEditMode, defaultType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCategoryInput(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !id) return;

    setImageLoading(true);
    const formData = new FormData();
    formData.append("uploadedFile", file);
    formData.append("folderName", "categories");
    if (categoryInput.coverImage) {
      formData.append("oldImage", categoryInput.coverImage);
    }

    try {
      // Step 1: Upload the image first
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/backendimages`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Failed to upload image");
        return;
      }

      const data = await res.json();
      const filename = data.filename;

      // Step 2: Update the category with the new image filename
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: filename }),
      });

      if (updateRes.ok) {
        toast.success("Image uploaded and saved");
        
        // Update local state
        setCategoryInput(prev => ({
          ...prev,
          coverImage: filename
        }));

        // Update image preview
        setImagePreview(getCategoryImageUrl(filename));
      } else {
        const responseData = await updateRes.json();
        toast.error(responseData.error || "Failed to update category with new image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Image upload failed");
    } finally {
      if (event.target) {
        event.target.value = ""; // reset input
      }
      setImageLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (categoryInput.name.trim().length === 0) {
      toast.error("Category name cannot be empty");
      return;
    }

    setIsLoading(true);

    const formattedName = convertCategoryNameToURLFriendly(categoryInput.name);
    
    const categoryData = {
      name: formattedName,
      type: categoryInput.type,
      metaTitle: categoryInput.metaTitle,
      metaDescription: categoryInput.metaDescription,
      coverImage: categoryInput.coverImage
    };

    const url = isEditMode 
      ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${id}`
      : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories`;

    const method = isEditMode ? "PUT" : "POST";
    
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${isEditMode ? "updating" : "creating"} category`);
      }

      const data = await response.json();
      
      toast.success(`Category ${isEditMode ? "updated" : "created"} successfully`);
      
      // Redirect based on category type
      const redirectUrl = categoryInput.type === "PRODUCT" 
        ? "/admin/categories" 
        : "/admin/blog-categories";
      
      router.push(redirectUrl);
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} category:`, error);
      toast.error(`Failed to ${isEditMode ? "update" : "create"} category`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode) return;
    
    if (!confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      toast.success("Category deleted successfully");
      
      // Redirect based on category type
      const redirectUrl = categoryInput.type === "PRODUCT" 
        ? "/admin/categories" 
        : "/admin/blog-categories";
      
      router.push(redirectUrl);
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-4 overflow-auto flex flex-col gap-y-7">
        <h1 className="text-3xl font-semibold">
          {isEditMode ? "Edit Category" : "Add New Category"}
        </h1>

        {isLoading ? (
          <div className="flex justify-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Category Name:</span>
                </label>
                <input
                  type="text"
                  name="name"
                  className="input input-bordered w-full"
                  value={categoryInput.name}
                  onChange={handleInputChange}
                  placeholder="Enter category name"
                />
              </div>

              {/* Type Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Category Type:</span>
                </label>
                <select
                  name="type"
                  className="select select-bordered w-full"
                  value={categoryInput.type}
                  onChange={handleInputChange}
                >
                  <option value="PRODUCT">PRODUCT</option>
                  <option value="BLOG">BLOG</option>
                </select>
              </div>

              {/* Cover Image Field */}
              <div className="form-control w-full md:col-span-2">
                <label className="label">
                  <span className="label-text">Cover Image:</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div
                    className="cursor-pointer relative h-32 w-32 border-2 border-dashed border-gray-300 flex justify-center items-center rounded-md overflow-hidden"
                    onClick={handleImageClick}
                  >
                    {imageLoading ? (
                      <span className="loading loading-spinner loading-md"></span>
                    ) : imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Category"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="text-xs mt-2 block">Click to upload</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>Click the box to upload a category image.</p>
                    <p>Recommended size: 800x600 pixels</p>
                    <p>Max file size: 2MB</p>
                    <p>Supported formats: JPG, PNG, WEBP</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleImageUpload}
                    accept="image/*"
                  />
                </div>
              </div>

              {/* Meta Title Field */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Meta Title:</span>
                </label>
                <input
                  type="text"
                  name="metaTitle"
                  className="input input-bordered w-full"
                  value={categoryInput.metaTitle}
                  onChange={handleInputChange}
                  placeholder="Enter meta title for SEO"
                />
              </div>

              {/* Meta Description Field */}
              <div className="form-control w-full md:col-span-2">
                <label className="label">
                  <span className="label-text">Meta Description:</span>
                </label>
                <textarea
                  name="metaDescription"
                  className="textarea textarea-bordered w-full h-32"
                  value={categoryInput.metaDescription}
                  onChange={handleInputChange}
                  placeholder="Enter meta description for SEO"
                />
              </div>
            </div>

            <div className="flex gap-x-4 mt-6">
              <button
                type="button"
                className="uppercase bg-blue-500 px-8 py-3 text-base md:text-lg border border-blue-500 font-bold text-white shadow-sm hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isEditMode ? "Update Category" : "Create Category"}
              </button>

              {isEditMode && (
                <button
                  type="button"
                  className="uppercase bg-red-600 px-8 py-3 text-base md:text-lg border border-red-600 font-bold text-white shadow-sm hover:bg-red-700 hover:text-white focus:outline-none focus:ring-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  Delete Category
                </button>
              )}
            </div>

            {isEditMode && (
              <p className="text-xl text-error max-sm:text-lg mt-4">
                Note: if you delete this category, you will delete all products or posts associated with the category.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryForm;