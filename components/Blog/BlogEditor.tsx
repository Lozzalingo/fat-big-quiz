"use client";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";
import BlogPostForm from "@/components/Blog/BlogPostForm";

interface BlogEditorProps {
  blogPostId?: string;
  mode: "create" | "edit";
}

const BlogEditor = ({ blogPostId, mode = "create" }: BlogEditorProps) => {
  const [blogPost, setBlogPost] = useState<any>({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    coverImage: "",
    published: false,
    metaTitle: "",
    metaDescription: "",
    authorId: "",
    categoryId: "",
  });
  
  const [blogCategories, setBlogCategories] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch authors
  const fetchAuthors = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users`);
      if (response.ok) {
        const data = await response.json();
        setAuthors(data);
      } else {
        toast.error("Failed to fetch authors");
      }
    } catch (error) {
      toast.error("Error fetching authors");
    }
  };

  // Fetch blog categories - only categories with type BLOG
  const fetchBlogCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?type=BLOG`);
      if (response.ok) {
        const data = await response.json();
        const categories = data.categories || data;
        setBlogCategories(categories);
        
        // Only set default category in create mode and if we have categories
        if (mode === "create" && categories.length > 0) {
          setBlogPost((prev: any) => ({
            ...prev,
            categoryId: categories[0].id,
          }));
        }
      } else {
        console.error("Failed to fetch blog categories");
      }
    } catch (error) {
      console.error("Error fetching blog categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch blog post data for edit mode
  const fetchBlogPostData = async () => {
    if (mode !== "edit" || !blogPostId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog/${blogPostId}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both possible response formats
        const post = data.posts?.[0] || data.post || data;
        setBlogPost(post);
      } else {
        toast.error("Failed to fetch blog post data");
      }
    } catch (error) {
      toast.error("Error fetching blog post data");
    } finally {
      setIsLoading(false);
    }
  };

  // Functionality for uploading cover image file
  const uploadFile = async (file: File, oldImage?: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append("uploadedFile", file);
    formData.append("folderName", "blog"); // Specify folder name for blogs
    if (oldImage) {
      formData.append("oldImage", oldImage); // Send old image name for deletion
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/backendimages`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Image uploaded successfully");
        return data.filename; // Return the new filename
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

  // Validate author ID
  const validateAuthorId = async (authorId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/${authorId}`);
      if (!response.ok) {
        toast.error("Invalid Author ID. Please select a valid author.");
        return false;
      }
      return true;
    } catch (error) {
      toast.error("Error validating Author ID");
      return false;
    }
  };

  // Handle form submission (create or update)
  const handleSubmit = async (blogPostData: any, selectedFile: File | null) => {
    setIsSubmitting(true);

    // Validate author ID
    const isAuthorValid = await validateAuthorId(blogPostData.authorId);
    if (!isAuthorValid) {
      setIsSubmitting(false);
      return;
    }

    let processedBlogPost = { ...blogPostData };

    // Upload the image if there's a new one
    if (selectedFile) {
      const newFilename = await uploadFile(selectedFile, blogPostData.coverImage);
      if (newFilename) {
        processedBlogPost = { ...processedBlogPost, coverImage: newFilename };
      } else {
        setIsSubmitting(false);
        return; // Stop if image upload fails
      }
    }

    if (mode === "create") {
      await createBlogPost({
        ...processedBlogPost,
        id: nanoid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (mode === "edit" && blogPostId) {
      await updateBlogPost(processedBlogPost);
    }

    setIsSubmitting(false);
  };

  // Create new blog post
  const createBlogPost = async (blogPostData: any) => {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blogPostData),
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog`, requestOptions);
      if (response.ok) {
        toast.success("Blog post added successfully");
        // Navigation is handled by BlogPostForm's back button
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "There was an error while creating the blog post");
      }
    } catch (error) {
      toast.error("There was an error while creating the blog post");
    }
  };

  // Update existing blog post
  const updateBlogPost = async (blogPostData: any) => {
    const requestOptions = {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blogPostData),
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog/${blogPostId}`, requestOptions);
      if (response.ok) {
        toast.success("Blog post successfully updated");
        // Refresh blog post data to ensure UI reflects the latest state
        fetchBlogPostData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "There was an error while updating the blog post");
      }
    } catch (error) {
      toast.error("There was an error while updating the blog post");
    }
  };

  // Delete blog post
  const deleteBlogPost = async () => {
    if (!confirm("Are you sure you want to delete this blog post?")) {
      return;
    }

    setIsDeleting(true);
    const requestOptions = {
      method: "DELETE",
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog/${blogPostId}`, requestOptions);
      if (response.ok) {
        toast.success("Blog post deleted successfully");
        // Note: router.push is not used here as it's handled in BlogPostForm
      } else {
        toast.error("There was an error while deleting the blog post");
      }
    } catch (error) {
      toast.error("There was an error while deleting the blog post");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchBlogCategories();
    fetchAuthors();
    fetchBlogPostData();
  }, [blogPostId]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="h-80 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <BlogPostForm
        initialData={blogPost}
        blogCategories={blogCategories}
        authors={authors}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        mode={mode}
        onDelete={mode === "edit" ? deleteBlogPost : undefined}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default BlogEditor;