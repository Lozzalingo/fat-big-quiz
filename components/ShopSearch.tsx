"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";

const ShopSearch = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState<string>(searchParams.get("search") || "");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update input when URL changes (e.g., back/forward navigation)
  useEffect(() => {
    setSearchInput(searchParams.get("search") || "");
  }, [searchParams]);

  const updateSearch = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to page 1 on search
    router.push(`/shop?${params.toString()}`);
  };

  // Debounced search - triggers automatically as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout - search after 300ms of no typing
    debounceRef.current = setTimeout(() => {
      updateSearch(value);
    }, 300);
  };

  const clearSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setSearchInput("");
    updateSearch("");
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full max-w-md max-lg:max-w-none">
      <div className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={handleInputChange}
          placeholder="Search products..."
          className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 focus:border-primary focus:outline-none"
        />
        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
        {searchInput && (
          <button
            type="button"
            onClick={clearSearch}
            data-track-button="Shop:Clear Search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FaTimes className="text-sm" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ShopSearch;
