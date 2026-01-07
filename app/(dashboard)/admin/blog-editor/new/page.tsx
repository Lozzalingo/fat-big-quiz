"use client";
import { DashboardSidebar } from "@/components";
import React from "react";
import BlogEditor from "@/components/Blog/BlogEditor";

const AddNewBlogPost = () => {
  return (
    <div className="bg-gray-50 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 overflow-auto">
        <BlogEditor mode="create" />
      </div>
    </div>
  );
};

export default AddNewBlogPost;