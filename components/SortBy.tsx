"use client";
import React from "react";
import { useSortStore } from "@/app/store/sortStore";

const SortBy = () => {
  const { sortBy, changeSortBy } = useSortStore();

  return (
    <div className="flex items-center gap-3 max-lg:flex-col max-lg:w-full max-lg:items-start">
      <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Sort</span>
      <select
        defaultValue={sortBy}
        onChange={(e) => changeSortBy(e.target.value)}
        className="border border-gray-300 py-2 px-3 text-xs font-medium tracking-wide bg-white focus:outline-none focus:border-primary transition-colors cursor-pointer max-lg:w-full"
        name="sort"
      >
        <option value="defaultSort">Default</option>
        <option value="titleAsc">A — Z</option>
        <option value="titleDesc">Z — A</option>
        <option value="lowPrice">Price: Low</option>
        <option value="highPrice">Price: High</option>
      </select>
    </div>
  );
};

export default SortBy;
