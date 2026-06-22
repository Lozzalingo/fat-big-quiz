"use client";
import React from "react";
import dynamic from "next/dynamic";

// Dynamically import BlogEditor with SSR disabled (Quill needs document)
const BlogEditor = dynamic(() => import("@/components/Blog/BlogEditor"), {
  ssr: false,
  loading: () => <div className="p-4">Loading editor...</div>,
});

interface DashboardBlogEditProps {
  params: { id: string };
}

const DashboardBlogEdit = ({ params: { id } }: DashboardBlogEditProps) => {
  return (
    <div className="min-h-screen">
      <BlogEditor mode="edit" blogPostId={id} />
    </div>
  );
};

export default DashboardBlogEdit;