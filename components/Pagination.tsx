// *********************
// Role of the component: Pagination for navigating the shop page
// Name of the component: Pagination.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <Pagination />
// Input parameters: no input parameters
// Output: Component with the current page and buttons for incrementing and decrementing page
// *********************

"use client";
import { usePaginationStore } from "@/app/store/paginationStore";
import React from "react";

const Pagination = () => {
  const { page, incrementPage, decrementPage } = usePaginationStore();
  return (
    <div className="flex justify-center items-center gap-0 py-12">
      <button
        className="border border-primary bg-white text-primary text-xs font-medium uppercase tracking-wide px-4 py-2.5 hover:bg-primary hover:text-white transition-colors"
        onClick={() => decrementPage()}
        data-track-button="Shop:Previous Page"
      >
        Prev
      </button>
      <span className="border-y border-primary bg-primary text-white text-xs font-medium uppercase tracking-wide px-5 py-2.5">
        {page}
      </span>
      <button
        className="border border-primary bg-white text-primary text-xs font-medium uppercase tracking-wide px-4 py-2.5 hover:bg-primary hover:text-white transition-colors"
        onClick={() => incrementPage()}
        data-track-button="Shop:Next Page"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;
