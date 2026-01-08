"use client";
import { DashboardSidebar } from "@/components";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaUpload, FaTrash, FaSave, FaArrowLeft } from "react-icons/fa";
import { getHomepageCardImageUrl } from "@/utils/cdn";
import Link from "next/link";

interface HomepageCardFormProps {
  mode: "create" | "edit";
  cardId?: string;
}

const cardTypes = [
  { value: "DOWNLOAD", label: "Download" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "EVENT", label: "Event" },
  { value: "APP", label: "App" },
  { value: "FREE", label: "Free" },
];

const HomepageCardForm: React.FC<HomepageCardFormProps> = ({ mode, cardId }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    href: "",
    badge: "",
    cardType: "DOWNLOAD",
    isActive: true,
  });
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && cardId) {
      fetchCard();
    }
  }, [mode, cardId]);

  const fetchCard = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/${cardId}`);
      if (!response.ok) throw new Error("Failed to fetch card");
      const data = await response.json();
      setFormData({
        title: data.title || "",
        description: data.description || "",
        price: data.price || "",
        href: data.href || "",
        badge: data.badge || "",
        cardType: data.cardType || "DOWNLOAD",
        isActive: data.isActive ?? true,
      });
      setImage(data.image);
    } catch (error) {
      console.error("Error fetching card:", error);
      toast.error("Failed to load card");
      router.push("/admin/homepage-cards");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const url = mode === "create"
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/${cardId}`;

      const response = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save card");
      }

      const savedCard = await response.json();
      toast.success(mode === "create" ? "Card created!" : "Card updated!");

      if (mode === "create") {
        router.push(`/admin/homepage-cards/${savedCard.id}`);
      }
    } catch (error: any) {
      console.error("Error saving card:", error);
      toast.error(error.message || "Failed to save card");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cardId) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("uploadedFile", file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/${cardId}/image`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");

      const data = await response.json();
      setImage(data.filename);
      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageRemove = async () => {
    if (!cardId || !confirm("Remove this image?")) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/${cardId}/image`, {
        method: "DELETE",
      });

      if (response.ok) {
        setImage(null);
        toast.success("Image removed");
      }
    } catch (error) {
      toast.error("Failed to remove image");
    }
  };

  const getImageUrl = () => {
    if (!image) return null;
    if (image.startsWith("/")) return image;
    return getHomepageCardImageUrl(image);
  };

  if (isLoading) {
    return (
      <div className="bg-gray-100 flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link href="/admin/homepage-cards" className="text-gray-500 hover:text-gray-700 flex items-center gap-2 text-sm">
              <FaArrowLeft /> Back to Homepage Cards
            </Link>
          </div>

          <div className="bg-white rounded-lg border p-6">
            <h1 className="text-2xl font-semibold mb-6">
              {mode === "create" ? "Create Homepage Card" : "Edit Homepage Card"}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="input input-bordered w-full"
                    placeholder="Fat Big Quiz On Stage"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                  <input
                    type="text"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    className="input input-bordered w-full"
                    placeholder="From £15, Free, £4.99/mo"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="textarea textarea-bordered w-full"
                  placeholder="A brief description of what this offering includes..."
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link (href) *</label>
                  <input
                    type="text"
                    name="href"
                    value={formData.href}
                    onChange={handleChange}
                    required
                    className="input input-bordered w-full"
                    placeholder="/shop or https://app.fatbigquiz.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge</label>
                  <input
                    type="text"
                    name="badge"
                    value={formData.badge}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Popular, New, Free"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                  <select
                    name="cardType"
                    value={formData.cardType}
                    onChange={handleChange}
                    className="select select-bordered w-full"
                  >
                    {cardTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Affects the icon/color when no image is set</p>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="checkbox checkbox-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">Active (visible on homepage)</span>
                  </label>
                </div>
              </div>

              {/* Image Upload - Only shown after card is created */}
              {mode === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Card Image</label>
                  <p className="text-xs text-gray-500 mb-3">Recommended size: 800x480px (5:3 ratio)</p>

                  {image ? (
                    <div className="relative inline-block">
                      <img
                        src={getImageUrl()!}
                        alt="Card preview"
                        className="h-40 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="absolute top-2 right-2 btn btn-sm btn-circle btn-error"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary transition">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                          <span className="loading loading-spinner"></span>
                        ) : (
                          <>
                            <FaUpload className="text-2xl text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Click to upload image</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {mode === "create" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    Save the card first to upload an image.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link href="/admin/homepage-cards">
                  <button type="button" className="btn btn-ghost">Cancel</button>
                </Link>
                <button type="submit" disabled={isSaving} className="btn btn-primary gap-2">
                  {isSaving ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <FaSave />
                  )}
                  {mode === "create" ? "Create Card" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageCardForm;
