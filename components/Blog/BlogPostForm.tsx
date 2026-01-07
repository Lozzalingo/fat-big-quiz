"use client";
import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { BlogPostFormProps } from "@/app/(dashboard)/admin/blog-editor/types";
import { BlogPostHeader } from "@/components/Blog/BlogPostHeader";
import { BlogPostFields } from "@/components/Blog/BlogPostFields";
import { CoverImageUploader } from "@/components/Blog/CoverImageUploader";
import { BlogPostPreview } from "@/components/Blog/BlogPostPreview";
import { quillModules, quillFormats } from "@/app/(dashboard)/admin/blog-editor/utils/quillConfig";
import { extractImageUrls, deleteUnusedImages } from "@/app/(dashboard)/admin/blog-editor/utils/imageUtils";
import { getBlogImageUrl } from "@/utils/cdn";
import toast from "react-hot-toast";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const BlogPostForm: React.FC<BlogPostFormProps> = ({
  initialData,
  blogCategories,
  authors,
  onSubmit,
  isSubmitting,
  mode,
  onDelete,
  isDeleting,
}) => {
  const [blogPost, setBlogPost] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    content: initialData?.content || "",
    excerpt: initialData?.excerpt || "",
    coverImage: initialData?.coverImage || "",
    published: initialData?.published || false,
    metaTitle: initialData?.metaTitle || "",
    metaDescription: initialData?.metaDescription || "",
    authorId: initialData?.authorId || "",
    categoryId: initialData?.categoryId || "",
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [contentImageUrls, setContentImageUrls] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    if (initialData?.coverImage) {
      setImagePreview(getBlogImageUrl(initialData.coverImage));
    }
    if (initialData?.content) {
      const initialImages = extractImageUrls(initialData.content);
      setContentImageUrls(initialImages);
      setUploadedImageUrls(initialImages);
    }
  }, [initialData]);

  useEffect(() => {
    const newImageUrls = extractImageUrls(blogPost.content);
    setContentImageUrls(newImageUrls);
  }, [blogPost.content]);

  useEffect(() => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      quill.on("text-change", () => {
        const content = quill.root.innerHTML;
        setContentImageUrls(extractImageUrls(content));
      });
    }
  }, [quillRef.current]);

  const handleSubmit = async () => {
    if (!blogPost.title || !blogPost.slug || !blogPost.content || !blogPost.excerpt || !blogPost.authorId || !blogPost.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const currentImages = contentImageUrls;
    const imagesToDelete = uploadedImageUrls.filter((img) => !currentImages.includes(img));
    if (imagesToDelete.length > 0) {
      console.log(`Found ${imagesToDelete.length} images to delete`);
      await deleteUnusedImages(imagesToDelete);
    }

    setUploadedImageUrls(currentImages);
    await onSubmit(blogPost, selectedFile);
  };

  const handleContentChange = (content: string) => {
    setBlogPost((prev) => ({ ...prev, content }));
    const currentImages = extractImageUrls(content);
    setContentImageUrls(currentImages);
    const newImages = currentImages.filter((img) => !uploadedImageUrls.includes(img));
    if (newImages.length > 0) {
      setUploadedImageUrls((prev) => [...prev, ...newImages]);
    }
  };

  return (
    <>
      <style jsx global>{`
        .ql-imageSize .ql-picker-label {
          display: flex;
          align-items: center;
          padding-right: 20px;
        }
        .ql-imageSize .ql-picker-label::before {
          content: "Size";
          margin-right: 5px;
        }
        .ql-imageSize .ql-picker-item[data-value="small"]::before {
          content: "Small";
        }
        .ql-imageSize .ql-picker-item[data-value="medium"]::before {
          content: "Medium";
        }
        .ql-imageSize .ql-picker-item[data-value="large"]::before {
          content: "Large";
        }
        .ql-imageSize .ql-picker-item[data-value="huge"]::before {
          content: "Huge";
        }
        img[style*="float: left"] {
          margin: 0 1em 1em 0;
        }
        img[style*="float: right"] {
          margin: 0 0 1em 1em;
        }
        img[style*="display: block"] {
          margin: 0 auto;
        }
      `}</style>
      <BlogPostHeader
        mode={mode}
        onPreviewToggle={() => setPreviewMode(!previewMode)}
        previewMode={previewMode}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onDelete={onDelete}
        isDeleting={isDeleting}
      />
      <div className="max-w-7xl mx-auto p-6">
        {previewMode ? (
          <BlogPostPreview
            imagePreview={imagePreview}
            blogPost={blogPost}
            blogCategories={blogCategories}
            authors={authors}
          />
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <BlogPostFields
                blogPost={blogPost}
                setBlogPost={setBlogPost}
              />
              <div className="space-y-6">
                <CoverImageUploader
                  imagePreview={imagePreview}
                  setImagePreview={setImagePreview}
                  selectedFile={selectedFile}
                  setSelectedFile={setSelectedFile}
                  fileInputRef={fileInputRef}
                  coverImage={blogPost.coverImage}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="category"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                      value={blogPost.categoryId}
                      onChange={(e) => setBlogPost({ ...blogPost, categoryId: e.target.value })}
                    >
                      <option value="">Select category</option>
                      {blogCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
                      Author <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="author"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                      value={blogPost.authorId}
                      onChange={(e) => setBlogPost({ ...blogPost, authorId: e.target.value })}
                    >
                      <option value="">Select author</option>
                      {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.firstName} {author.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publication Status</label>
                  <div className="flex items-center space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-blue-600"
                        checked={blogPost.published}
                        onChange={() => setBlogPost({ ...blogPost, published: true })}
                      />
                      <span className="ml-2 text-gray-700">Published</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-blue-600"
                        checked={!blogPost.published}
                        onChange={() => setBlogPost({ ...blogPost, published: false })}
                      />
                      <span className="ml-2 text-gray-700">Draft</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <ReactQuill
                theme="snow"
                value={blogPost.content}
                onChange={handleContentChange}
                modules={quillModules}
                formats={quillFormats}
                className="min-h-[400px]"
              />
              {contentImageUrls.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  <p>
                    {contentImageUrls.length} image{contentImageUrls.length !== 1 ? "s" : ""} in content
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BlogPostForm;