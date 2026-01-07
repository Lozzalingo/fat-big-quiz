"use client";
import { DashboardSidebar } from "@/components";
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
    <div className="bg-gray-50 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 overflow-auto">
        <BlogEditor mode="edit" blogPostId={id} />
      </div>
    </div>
  );
};

export default DashboardBlogEdit;