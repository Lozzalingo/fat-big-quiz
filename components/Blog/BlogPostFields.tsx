// BlogPostFields.tsx
import React from "react";

// Define the BlogPost type
export interface BlogPost {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  published: boolean;
  metaTitle: string;
  metaDescription: string;
  authorId: string;
  categoryId: string;
}

// Define the props interface for BlogPostFields
interface BlogPostFieldsProps {
  blogPost: BlogPost;
  setBlogPost: React.Dispatch<React.SetStateAction<BlogPost>>;
}

export const BlogPostFields: React.FC<BlogPostFieldsProps> = ({ blogPost, setBlogPost }) => {
  // Helper function to convert title to slug
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  // Handle title change and optionally update slug
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setBlogPost((prev) => ({
      ...prev,
      title: newTitle,
      // Only auto-generate slug if it's empty or was auto-generated before
      slug: prev.slug === generateSlug(prev.title) ? generateSlug(newTitle) : prev.slug,
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={blogPost.title}
          onChange={handleTitleChange}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          placeholder="Enter post title"
        />
      </div>
      
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          id="slug"
          type="text"
          value={blogPost.slug}
          onChange={(e) => setBlogPost({ ...blogPost, slug: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          placeholder="enter-post-slug"
        />
      </div>
      
      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
          Excerpt <span className="text-red-500">*</span>
        </label>
        <textarea
          id="excerpt"
          value={blogPost.excerpt}
          onChange={(e) => setBlogPost({ ...blogPost, excerpt: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Brief summary of the post"
        />
      </div>
      
      <div>
        <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">
          Meta Title
        </label>
        <input
          id="metaTitle"
          type="text"
          value={blogPost.metaTitle}
          onChange={(e) => setBlogPost({ ...blogPost, metaTitle: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          placeholder="SEO title (defaults to post title if empty)"
        />
      </div>
      
      <div>
        <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-1">
          Meta Description
        </label>
        <textarea
          id="metaDescription"
          value={blogPost.metaDescription}
          onChange={(e) => setBlogPost({ ...blogPost, metaDescription: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="SEO description (defaults to excerpt if empty)"
        />
      </div>
    </div>
  );
};  