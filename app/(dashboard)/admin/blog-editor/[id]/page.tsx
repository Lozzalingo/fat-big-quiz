"use client";
import { DashboardSidebar } from "@/components";
import React from "react";
import BlogEditor from "@/components/Blog/BlogEditor";

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