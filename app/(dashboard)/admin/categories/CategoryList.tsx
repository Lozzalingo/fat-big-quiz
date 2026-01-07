"use client";
import { CustomButton, DashboardSidebar } from "@/components";
import toast from "react-hot-toast";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { convertCategoryNameToURLFriendly } from "../../../../utils/categoryFormatting";
import { getCategoryImageUrl } from "@/utils/cdn";

interface DashboardSingleCategoryProps {
  id?: string;
  categoryType: string;
}

interface Category {
  id: string;
  name: string;
  coverImage?: string;
  type: string;
}

const DashboardSingleCategory = ({ id, categoryType }: DashboardSingleCategoryProps) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [editedCategories, setEditedCategories] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryForImage, setSelectedCategoryForImage] = useState<Category | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const placeholderImage = "/placeholder-image.png"; // Update with your actual placeholder path

  const handleImageClick = (category: Category) => {
    setSelectedCategoryForImage(category);
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCategoryForImage) return;

    const formData = new FormData();
    formData.append("uploadedFile", file);
    formData.append("folderName", "categories");
    if (selectedCategoryForImage.coverImage) {
      formData.append("oldImage", selectedCategoryForImage.coverImage);
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
      const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${selectedCategoryForImage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: filename }),
      });

      if (updateRes.ok) {
        toast.success("Image uploaded and saved");
        
        // Update local state
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === selectedCategoryForImage.id ? { ...cat, coverImage: filename } : cat
          )
        );
      } else {
        const responseData = await updateRes.json();
        toast.error(responseData.error || "Failed to update category with new image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Image upload failed");
    } finally {
      event.target.value = ""; // reset input
      setSelectedCategoryForImage(null);
    }
  };

  const deleteProductCategory = async (categoryId: string) => {
    const requestOptions = { method: "DELETE" };
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryId}`, requestOptions)
      .then((response) => {
        if (response.status === 204) {
          toast.success("Category deleted successfully");
          setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
        } else {
          throw Error("There was an error deleting a category");
        }
      })
      .catch(() => {
        toast.error("There was an error deleting category");
      });
  };

  const updateCategory = async (categoryId: string) => {
    const newName = editedCategories[categoryId];
    if (!newName || newName.trim().length === 0) {
      toast.error("Category name cannot be empty");
      return;
    }
  
    // Find the current category to get its coverImage
    const currentCategory = categories.find(cat => cat.id === categoryId);
    if (!currentCategory) return;
  
    console.log("Updating category with data:", {
      name: convertCategoryNameToURLFriendly(newName),
      coverImage: currentCategory.coverImage,
      type: categoryType
    });
    
    const requestOptions = {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: convertCategoryNameToURLFriendly(newName),
        coverImage: currentCategory.coverImage,
        type: categoryType
      }),
    };
  
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${categoryId}`, requestOptions);
      const responseData = await response.json();
      
      console.log("Update response:", responseData);
      
      if (response.ok) {
        toast.success("Category successfully updated");
        setCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId ? { ...cat, name: newName, coverImage: currentCategory.coverImage, type: categoryType } : cat
          )
        );
      } else {
        toast.error(responseData.error || "Error updating category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("There was an error while updating a category");
    }
  };

  const handleNameChange = (id: string, value: string) => {
    setEditedCategories((prev) => ({ ...prev, [id]: value }));
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, id: string) => {
    e.dataTransfer.setData("categoryId", id);
  };

  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, dropTargetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("categoryId");
    if (draggedId === dropTargetId) return;

    const draggedIndex = categories.findIndex((cat) => cat.id === draggedId);
    const dropIndex = categories.findIndex((cat) => cat.id === dropTargetId);
    const updated = [...categories];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);
    setCategories(updated);
  };

  useEffect(() => {
    // If an ID is provided, fetch that specific category
    if (id) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories/${id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          setCategories([data]);
          setEditedCategories({ [data.id]: data.name });
        })
        .catch(error => {
          console.error("Error fetching category:", error);
          toast.error("Failed to load category");
        });
    } else {
      // Otherwise, fetch all categories of the specified type
      const url = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories`);
      if (categoryType) {
        url.searchParams.append('type', categoryType);
      }
      
      console.log(`Fetching categories with type filter: ${categoryType}`, url.toString());
      
      fetch(url.toString())
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log(`Received ${data.length} categories:`, data);
          setCategories(data);
          const initialNames = data.reduce((acc: any, curr: Category) => {
            acc[curr.id] = curr.name;
            return acc;
          }, {});
          setEditedCategories(initialNames);
        })
        .catch(error => {
          console.error("Error fetching categories:", error);
          toast.error("Failed to load categories");
        });
    }
  }, [id, categoryType]);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Determine the appropriate title based on the category type
  const getCategoryTitle = () => {
    if (id) {
      return `${categoryType} Category: ${categories[0]?.name || ''}`;
    }
    return `All ${categoryType} Categories`;
  };

  // Determine the appropriate new category link based on category type
  const getNewCategoryLink = () => {
    return `/admin/categories/new?type=${categoryType}`;
  };

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6 max-xl:flex-col max-xl:gap-y-4 max-xl:items-start">
            <h1 className="text-2xl font-semibold">{getCategoryTitle()}</h1>
            <div className="flex gap-4 max-xl:flex-col max-xl:w-full">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full max-w-xs"
              />
              <Link href={getNewCategoryLink()}>
                <CustomButton
                  buttonType="button"
                  customWidth="110px"
                  paddingX={10}
                  paddingY={5}
                  textSize="base"
                  text={`Add new ${categoryType} category`}
                />
              </Link>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="table table-md table-pin-cols w-full">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((category: Category) => (
                <tr
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, category.id)}
                >
                  <td className="w-20 cursor-pointer" onClick={() => handleImageClick(category)}>
                    <img
                      src={category.coverImage ? getCategoryImageUrl(category.coverImage) : placeholderImage}
                      alt="Category"
                      className="h-12 w-12 object-cover rounded"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={editedCategories[category.id] || ""}
                      onChange={(e) =>
                        handleNameChange(category.id, e.target.value)
                      }
                      className="input input-bordered w-full max-w-xs"
                    />
                  </td>
                  <td className="flex gap-2">
                    <Link href={`/admin/categories/${category.id}`}>
                      <button className="btn-edit btn btn-sm">Edit</button>
                    </Link>
                    <button className="btn-save btn btn-sm" onClick={() => updateCategory(category.id)}>Save</button>
                    <button className="btn-delete btn btn-sm" onClick={() => deleteProductCategory(category.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleImageUpload}
            accept="image/*"
          />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSingleCategory;