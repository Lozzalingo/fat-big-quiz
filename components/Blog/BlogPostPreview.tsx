import React from "react";
import { CheckSquare } from "lucide-react";

interface BlogPost {
  title: string;
  content: string;
  excerpt: string;
  published: boolean;
  categoryId: string;
  authorId: string;
}

interface BlogPostPreviewProps {
  imagePreview: string | null;
  blogPost: BlogPost;
  blogCategories: any[];
  authors: any[];
}

export const BlogPostPreview: React.FC<BlogPostPreviewProps> = ({
  imagePreview,
  blogPost,
  blogCategories,
  authors,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-8">
      {imagePreview && <img src={imagePreview} alt={blogPost.title} className="w-full h-72 object-cover rounded-t-xl" />}
      <div className="mt-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            blogPost.published ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
          }`}
        >
          <CheckSquare size={14} className="mr-1" />
          {blogPost.published ? "Published" : "Draft"}
        </span>
      </div>
      {blogPost.categoryId && (
        <span className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
          {blogCategories.find((cat) => cat.id === blogPost.categoryId)?.name || "Unknown"}
        </span>
      )}
      <h1 className="text-3xl font-bold text-gray-900 mt-4">{blogPost.title}</h1>
      <div className="text-gray-600 italic my-6 border-l-4 border-gray-200 pl-4">{blogPost.excerpt}</div>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: blogPost.content }} />
      {blogPost.authorId && (
        <p className="mt-8 pt-6 border-t text-sm text-gray-500">
          Written by: {authors.find((author) => author.id === blogPost.authorId)?.firstName || "Unknown"}
        </p>
      )}
    </div>
  );
};