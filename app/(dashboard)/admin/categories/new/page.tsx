"use client";
import React from "react";
import dynamic from "next/dynamic";

// Use dynamic import to handle client-side only components
const CategoryForm = dynamic(() => import("@/app/(dashboard)/admin/categories/CategoryForm"), {
  ssr: false,
});

const NewCategoryPage = () => {
  return <CategoryForm />;
};

export default NewCategoryPage;