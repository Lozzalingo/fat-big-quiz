"use client";
import React from "react";
import dynamic from "next/dynamic";

// Dynamically import BlogEditor with SSR disabled (Quill needs document)
const BlogEditor = dynamic(() => import("@/components/Blog/BlogEditor"), {
  ssr: false,
  loading: () => <div className="p-4">Loading editor...</div>,
});

const AddNewBlogPost = () => {
  return (
    <div className="min-h-screen">
      <BlogEditor mode="create" />
    </div>
  );
};

export default AddNewBlogPost;