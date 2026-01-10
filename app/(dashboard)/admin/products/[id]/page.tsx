"use client";
import { DashboardSidebar } from "@/components";
import {
  convertCategoryNameToURLFriendly as convertSlugToURLFriendly,
  formatCategoryName,
} from "@/utils/categoryFormatting";
import React, { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import { FaImage, FaFileDownload, FaTimes, FaPlus, FaGripVertical, FaStar } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { getProductImageUrl, getDownloadFileUrl } from "@/utils/cdn";

type ProductType = "PHYSICAL" | "DIGITAL_DOWNLOAD" | "SUBSCRIPTION" | "EVENT";

interface QuizFormat {
  id: string;
  name: string;
  displayName: string;
}

interface UploadedImage {
  file?: File;
  preview: string;
  isPrimary: boolean;
  isExisting?: boolean;
  filename?: string;
}

interface DownloadFile {
  file?: File;
  name: string;
  size?: number;
  isExisting?: boolean;
  filename?: string;
}

interface DashboardProductDetailsProps {
  params: { id: string };
}

const DashboardProductDetails = ({
  params: { id },
}: DashboardProductDetailsProps) => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const downloadFileInputRef = useRef<HTMLInputElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  const [product, setProduct] = useState<{
    title: string;
    price: number;
    manufacturer: string;
    inStock: number;
    mainImage: string;
    description: string;
    slug: string;
    categoryId: string;
    quizFormatId: string | null;
    productType: ProductType;
    downloadFile: string;
    features: string;
    videoUrl: string;
  }>({
    title: "",
    price: 0,
    manufacturer: "",
    inStock: 1,
    mainImage: "",
    description: "",
    slug: "",
    categoryId: "",
    quizFormatId: "",
    productType: "DIGITAL_DOWNLOAD",
    downloadFile: "",
    features: "",
    videoUrl: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [quizFormats, setQuizFormats] = useState<QuizFormat[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<DownloadFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(true); // Start true for existing products

  const MAX_TITLE_LENGTH = 140;
  const MAX_DESCRIPTION_LENGTH = 5000;
  const MAX_IMAGES = 10;
  const MAX_TAGS = 30;
  const MAX_DOWNLOAD_FILES = 10;

  // Auto-generate slug from title
  const handleTitleChange = (newTitle: string) => {
    setProduct(prev => {
      const updates: any = { title: newTitle };
      // Auto-generate slug if not manually edited
      if (!slugManuallyEdited) {
        updates.slug = convertSlugToURLFriendly(newTitle);
      }
      return { ...prev, ...updates };
    });
  };

  // Handle manual slug edits
  const handleSlugChange = (newSlug: string) => {
    setSlugManuallyEdited(true);
    setProduct(prev => ({ ...prev, slug: convertSlugToURLFriendly(newSlug) }));
  };

  // Fetch product data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch product
        const productRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${id}`);
        if (!productRes.ok) throw new Error("Product not found");
        const productData = await productRes.json();

        setProduct({
          title: productData.title || "",
          price: productData.price || 0,
          manufacturer: productData.manufacturer || "",
          inStock: productData.inStock ?? 1,
          mainImage: productData.mainImage || "",
          description: productData.description || "",
          slug: productData.slug || "",
          categoryId: productData.categoryId || "",
          quizFormatId: productData.quizFormatId || "",
          productType: productData.productType || "DIGITAL_DOWNLOAD",
          downloadFile: productData.downloadFile || "",
          features: productData.features || "",
          videoUrl: productData.videoUrl || "",
        });

        // Set categories
        if (productData.categories && Array.isArray(productData.categories)) {
          const catIds = productData.categories.map((pc: any) => pc.categoryId || pc.category?.id);
          setSelectedCategoryIds(catIds.filter((id: string) => id));
        }

        // Set tags
        if (productData.tags) {
          try {
            const parsedTags = JSON.parse(productData.tags);
            if (Array.isArray(parsedTags)) {
              setTags(parsedTags);
            }
          } catch {
            // If not valid JSON, ignore
          }
        }

        // Set main image and additional images
        const images: UploadedImage[] = [];
        if (productData.mainImage) {
          images.push({
            preview: getProductImageUrl(productData.mainImage),
            isPrimary: true,
            isExisting: true,
            filename: productData.mainImage,
          });
        }

        // Fetch additional images from Image table
        try {
          const imagesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/images/${id}`);
          if (imagesRes.ok) {
            const additionalImages = await imagesRes.json();
            if (Array.isArray(additionalImages)) {
              additionalImages.forEach((img: { imageID: string; image: string }) => {
                images.push({
                  preview: getProductImageUrl(img.image),
                  isPrimary: false,
                  isExisting: true,
                  filename: img.image,
                });
              });
            }
          }
        } catch (e) {
          console.error("Error fetching additional images:", e);
        }

        setUploadedImages(images);

        // Parse download files
        if (productData.downloadFile) {
          try {
            const files = JSON.parse(productData.downloadFile);
            if (Array.isArray(files)) {
              setDownloadFiles(files.map((f: string) => ({
                name: f,
                isExisting: true,
                filename: f,
              })));
            } else {
              setDownloadFiles([{
                name: productData.downloadFile,
                isExisting: true,
                filename: productData.downloadFile,
              }]);
            }
          } catch {
            if (productData.downloadFile) {
              setDownloadFiles([{
                name: productData.downloadFile,
                isExisting: true,
                filename: productData.downloadFile,
              }]);
            }
          }
        }

        // Fetch categories
        const catRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?type=PRODUCT`);
        const catData = await catRes.json();
        setCategories(catData);

        // Fetch quiz formats
        const formatRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/quiz-formats`);
        const formatData = await formatRes.json();
        setQuizFormats(formatData);

      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Handle multiple download file uploads
  const handleDownloadFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = MAX_DOWNLOAD_FILES - downloadFiles.length;
    const newFiles: DownloadFile[] = Array.from(files).slice(0, remainingSlots).map(file => ({
      file,
      name: file.name,
      size: file.size,
      isExisting: false,
    }));

    setDownloadFiles([...downloadFiles, ...newFiles]);
    if (downloadFileInputRef.current) downloadFileInputRef.current.value = '';
  };

  const removeDownloadFile = (index: number) => {
    setDownloadFiles(downloadFiles.filter((_, i) => i !== index));
  };

  // Drag handlers for reordering download files
  const handleFileDragStart = (index: number) => {
    setDraggedFileIndex(index);
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedFileIndex === null || draggedFileIndex === dropIndex) return;

    const newFiles = [...downloadFiles];
    const [draggedFile] = newFiles.splice(draggedFileIndex, 1);
    newFiles.splice(dropIndex, 0, draggedFile);
    setDownloadFiles(newFiles);
    setDraggedFileIndex(null);
  };

  // Drag handlers for reordering images
  const handleImageDragStart = (index: number) => {
    setDraggedImageIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedImageIndex === null || draggedImageIndex === dropIndex) return;

    const newImages = [...uploadedImages];
    const [draggedImage] = newImages.splice(draggedImageIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Update primary status - first image becomes primary
    const updatedImages = newImages.map((img, i) => ({
      ...img,
      isPrimary: i === 0
    }));

    setUploadedImages(updatedImages);
    setDraggedImageIndex(null);
  };

  // Handle multiple image uploads
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];
    const remainingSlots = MAX_IMAGES - uploadedImages.length;

    Array.from(files).slice(0, remainingSlots).forEach((file) => {
      if (file.type.startsWith('image/')) {
        newImages.push({
          file,
          preview: URL.createObjectURL(file),
          isPrimary: uploadedImages.length === 0 && newImages.length === 0,
          isExisting: false,
        });
      }
    });

    setUploadedImages([...uploadedImages, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    // If we removed the primary, make the first one primary
    if (uploadedImages[index].isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    setUploadedImages(newImages);
  };

  const setPrimaryImage = (index: number) => {
    setUploadedImages(uploadedImages.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    })));
  };

  // Tag handling
  const addTag = () => {
    // Split by comma to allow multiple tags at once
    const newTags = tagInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t && !tags.includes(t));

    // Respect the MAX_TAGS limit
    const tagsToAdd = newTags.slice(0, MAX_TAGS - tags.length);
    if (tagsToAdd.length > 0) {
      setTags([...tags, ...tagsToAdd]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const uploadFile = async (file: File, folderName: string = "products/images"): Promise<string | null> => {
    const formData = new FormData();
    formData.append("uploadedFile", file);
    formData.append("folderName", folderName);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/backendimages`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return data.filename;
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "File upload unsuccessful");
        return null;
      }
    } catch (error) {
      console.error("Error during file upload:", error);
      toast.error("There was an error during file upload");
      return null;
    }
  };

  const updateProduct = async () => {
    if (!product.title || !product.description || !product.slug) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error("Please add at least one photo");
      return;
    }

    if (selectedCategoryIds.length === 0) {
      toast.error("Please select at least one category");
      categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    let productToSubmit = { ...product };

    // Upload new primary image if changed
    const primaryImage = uploadedImages.find(img => img.isPrimary) || uploadedImages[0];
    if (primaryImage && !primaryImage.isExisting && primaryImage.file) {
      const newFileName = await uploadFile(primaryImage.file, "products/images");
      if (newFileName) {
        productToSubmit = { ...productToSubmit, mainImage: newFileName };
      } else {
        setIsSubmitting(false);
        return;
      }
    } else if (primaryImage?.filename) {
      productToSubmit = { ...productToSubmit, mainImage: primaryImage.filename };
    }

    // Handle download files for digital products - upload in parallel
    if (product.productType === "DIGITAL_DOWNLOAD") {
      const uploadPromises = downloadFiles.map(async (file, index) => {
        if (file.isExisting && file.filename) {
          return { index, filename: file.filename };
        } else if (file.file) {
          const downloadFileName = await uploadFile(file.file, "downloads");
          return { index, filename: downloadFileName };
        }
        return { index, filename: null };
      });

      const results = await Promise.all(uploadPromises);

      // Check for failed uploads
      const failedUpload = results.find(r => r.filename === null && downloadFiles[r.index]?.file);
      if (failedUpload) {
        setIsSubmitting(false);
        return;
      }

      // Sort by original index to maintain order, filter out nulls
      const uploadedFileNames = results
        .sort((a, b) => a.index - b.index)
        .map(r => r.filename)
        .filter((f): f is string => f !== null);

      productToSubmit = { ...productToSubmit, downloadFile: JSON.stringify(uploadedFileNames) };
    }

    const submitData = {
      ...productToSubmit,
      categoryIds: selectedCategoryIds,
      quizFormatId: product.quizFormatId || null,
      tags: tags,
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // Delete existing additional images and re-add them
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/images/${id}`, {
          method: "DELETE",
        });

        // Upload additional images in parallel (non-primary)
        const additionalImages = uploadedImages.filter(img => !img.isPrimary);
        const imageUploadPromises = additionalImages.map(async (img) => {
          let fileName = img.filename;

          // If it's a new image, upload it first
          if (!img.isExisting && img.file) {
            fileName = await uploadFile(img.file, "products/images");
          }

          return fileName;
        });

        const uploadedImageNames = await Promise.all(imageUploadPromises);

        // Save image records sequentially to maintain order
        for (const fileName of uploadedImageNames) {
          if (fileName) {
            await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/images`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                productID: id,
                image: fileName,
              }),
            });
          }
        }

        toast.success("Product updated successfully");
      } else {
        throw new Error("Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("There was an error updating the product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async () => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${id}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        toast.success("Product deleted successfully");
        router.push("/admin/products");
      } else if (response.status === 400) {
        toast.error("Cannot delete product because it has associated orders");
      } else {
        throw new Error("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("There was an error deleting the product");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-100 flex min-h-screen">
        <DashboardSidebar />
        <div className="flex-1 min-w-0 overflow-auto flex items-center justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />

      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-auto">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Edit listing</h1>
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/admin/products")}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={updateProduct}
                disabled={isSubmitting}
                className="px-6 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* About Section */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1">About</h2>
            <p className="text-sm text-gray-500 mb-6">Tell the world all about your item and why they'll love it.</p>

            {/* Title */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Include keywords that buyers would use to search for your item.
              </p>
              <input
                type="text"
                maxLength={MAX_TITLE_LENGTH}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                placeholder="e.g. Ultimate Pub Quiz Pack - 100 Questions with Answers"
                value={product.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {product.title.length}/{MAX_TITLE_LENGTH}
              </div>
            </div>

            {/* Photos */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Photos <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Add up to {MAX_IMAGES} photos. Use high-quality images. The first image will be your thumbnail. Drag to reorder.
              </p>

              <div className="flex flex-wrap gap-3">
                {/* Uploaded Images */}
                {uploadedImages.map((img, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleImageDragStart(index)}
                    onDragOver={handleImageDragOver}
                    onDrop={(e) => handleImageDrop(e, index)}
                    className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-2 cursor-move transition ${
                      img.isPrimary ? 'border-black' : 'border-gray-200'
                    } ${draggedImageIndex === index ? 'opacity-50 border-blue-400' : ''} group`}
                  >
                    {/* Drag handle indicator */}
                    <div className="absolute top-1 right-1 z-10 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition">
                      <FaGripVertical className="text-white text-xs" />
                    </div>
                    {/* Position number */}
                    <div className="absolute bottom-1 right-1 z-10 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                      {index + 1}
                    </div>
                    <img
                      src={img.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Primary badge */}
                    {img.isPrimary && (
                      <div className="absolute top-1 left-1 bg-black text-white text-xs px-1.5 py-0.5 rounded">
                        Primary
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      {!img.isPrimary && (
                        <button
                          onClick={() => setPrimaryImage(index)}
                          className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                          title="Set as primary"
                        >
                          <FaStar className="text-sm text-gray-700" />
                        </button>
                      )}
                      <button
                        onClick={() => removeImage(index)}
                        className="p-1.5 bg-white rounded-full hover:bg-gray-100"
                        title="Remove"
                      >
                        <FaTimes className="text-sm text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Photo Button */}
                {uploadedImages.length < MAX_IMAGES && (
                  <label className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <FaPlus className="text-2xl text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Add photo</span>
                  </label>
                )}
              </div>
            </div>

            {/* Thumbnail Info */}
            {uploadedImages.length > 1 && (
              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Thumbnail:</strong> Click the star icon on any image to set it as your listing's primary photo.
                </p>
              </div>
            )}

            {/* Digital Files - for digital products */}
            {product.productType === "DIGITAL_DOWNLOAD" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Digital files <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload up to {MAX_DOWNLOAD_FILES} files that buyers will receive after purchase. Drag to reorder.
                </p>

                {/* List of uploaded files */}
                {downloadFiles.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {downloadFiles.map((file, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={() => handleFileDragStart(index)}
                        onDragOver={handleFileDragOver}
                        onDrop={(e) => handleFileDrop(e, index)}
                        className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border cursor-move transition ${
                          draggedFileIndex === index ? "opacity-50 border-blue-400" : ""
                        }`}
                      >
                        <FaGripVertical className="text-gray-400 flex-shrink-0" />
                        <FaFileDownload className="text-lg text-green-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          {file.size && (
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          )}
                          {file.isExisting && (
                            <p className="text-xs text-green-600">Existing file</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 px-2">{index + 1}</span>
                        <button
                          onClick={() => removeDownloadFile(index)}
                          className="p-1.5 hover:bg-gray-200 rounded transition"
                        >
                          <FaTimes className="text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add more files button */}
                {downloadFiles.length < MAX_DOWNLOAD_FILES && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition">
                    <input
                      ref={downloadFileInputRef}
                      type="file"
                      id="downloadFile"
                      multiple
                      className="hidden"
                      onChange={handleDownloadFileUpload}
                    />
                    <label htmlFor="downloadFile" className="cursor-pointer">
                      <FaFileDownload className="text-3xl text-gray-400 mx-auto mb-2" />
                      <p className="text-sm font-medium">
                        {downloadFiles.length > 0 ? "Add more files" : "Upload files"}
                      </p>
                      <p className="text-xs text-gray-500">PDF, ZIP, or any file type</p>
                    </label>
                  </div>
                )}

                {downloadFiles.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {downloadFiles.length}/{MAX_DOWNLOAD_FILES} files
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                What makes your item special? Buyers will only see the first few lines unless they expand the description.
              </p>
              <textarea
                rows={6}
                maxLength={MAX_DESCRIPTION_LENGTH}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black resize-none"
                placeholder="Describe what you're selling..."
                value={product.description}
                onChange={(e) => setProduct({ ...product, description: e.target.value })}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {product.description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Features
              </label>
              <p className="text-xs text-gray-500 mb-2">
                List key selling points (one per line). These appear on your product landing page.
              </p>
              <textarea
                rows={4}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black resize-none"
                placeholder="Instant PDF download&#10;100 quiz questions with answers&#10;Print-ready format&#10;Multiple difficulty levels"
                value={product.features}
                onChange={(e) => setProduct({ ...product, features: e.target.value })}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Add up to {MAX_TAGS} tags to help people find your listing.
              </p>

              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm"
                  >
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <FaTimes className="text-xs" />
                    </button>
                  </span>
                ))}
              </div>

              {tags.length < MAX_TAGS && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Add tags (comma-separated)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              )}

              {tags.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {tags.length}/{MAX_TAGS} tags
                </p>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1">Details</h2>
            <p className="text-sm text-gray-500 mb-6">Share a few more specifics about your item.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  value={product.productType}
                  onChange={(e) => setProduct({ ...product, productType: e.target.value as ProductType })}
                >
                  <option value="DIGITAL_DOWNLOAD">Digital download</option>
                  <option value="PHYSICAL">Physical item</option>
                  <option value="SUBSCRIPTION">Subscription</option>
                  <option value="EVENT">Event / Experience</option>
                </select>
              </div>

              {/* Quiz Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quiz Format
                </label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  value={product.quizFormatId || ""}
                  onChange={(e) => setProduct({ ...product, quizFormatId: e.target.value || null })}
                >
                  <option value="">Select a quiz format...</option>
                  {quizFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categories (Multi-select) */}
              <div ref={categoriesRef} className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories (Themes) <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Select all categories that apply to this product.
                </p>
                <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
                  {categories.map((category: Category) => (
                    <label
                      key={category.id}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition ${
                        selectedCategoryIds.includes(category.id)
                          ? 'bg-black text-white'
                          : 'bg-white border border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategoryIds.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="sr-only"
                      />
                      <span className="text-sm">{formatCategoryName(category.name)}</span>
                    </label>
                  ))}
                </div>
                {selectedCategoryIds.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected
                  </p>
                )}
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug <span className="text-red-500">*</span>
                  {!slugManuallyEdited && product.slug && (
                    <span className="ml-2 text-xs text-green-600 font-normal">(auto-generated)</span>
                  )}
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm text-gray-500">
                    /product/
                  </span>
                  <input
                    type="text"
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="my-quiz-pack"
                    value={product.slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSlugManuallyEdited(false);
                    setProduct(prev => ({ ...prev, slug: convertSlugToURLFriendly(prev.title) }));
                  }}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  Generate from title
                </button>
              </div>

              {/* Manufacturer/Brand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="Fat Big Quiz"
                  value={product.manufacturer}
                  onChange={(e) => setProduct({ ...product, manufacturer: e.target.value })}
                />
              </div>

              {/* Video URL */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={product.videoUrl}
                  onChange={(e) => setProduct({ ...product, videoUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Price & Inventory Section */}
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-1">Price & Inventory</h2>
            <p className="text-sm text-gray-500 mb-6">Set your listing's price and availability.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="0.00"
                    value={product.price || ""}
                    onChange={(e) => setProduct({ ...product, price: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  value={product.inStock}
                  onChange={(e) => setProduct({ ...product, inStock: Number(e.target.value) })}
                >
                  <option value={1}>In stock</option>
                  <option value={0}>Out of stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg border border-red-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-600 mb-1">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-4">Irreversible actions for this product.</p>

            <button
              onClick={deleteProduct}
              className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700"
            >
              Delete this product
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Note: Products with associated orders cannot be deleted.
            </p>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              onClick={() => router.push("/admin/products")}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={updateProduct}
              disabled={isSubmitting}
              className="px-8 py-2.5 bg-black text-white font-medium rounded-full hover:bg-gray-800 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardProductDetails;
