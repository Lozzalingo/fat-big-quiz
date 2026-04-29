// *********************
// Role of the component: Simple Etsy-style pagination for the shop page
// Name of the component: Pagination.tsx
// Version: 3.0
// Component call: <Pagination />
// Output: Simple prev/next with page numbers, stable layout
// *********************

"use client";
import { usePaginationStore } from "@/app/store/paginationStore";
import { useSearchParams, useRouter } from "next/navigation";
import React, { useCallback, useMemo } from "react";

/**
 * Build the visible page numbers - Etsy style.
 * Always shows a fixed window of up to 5 pages so nothing shifts around.
 */
function buildPageRange(current: number, total: number): number[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  // Keep a window of 5 centred on current
  let start = current - 2;
  let end = current + 2;

  if (start < 1) {
    start = 1;
    end = 5;
  }
  if (end > total) {
    end = total;
    start = total - 4;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const Pagination = () => {
  const { page, totalPages, setPage } = usePaginationStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page) return;

      setPage(newPage);

      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [page, totalPages, setPage, searchParams, router]
  );

  const pages = useMemo(() => buildPageRange(page, totalPages), [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Shop pagination" className="flex justify-center items-center gap-2 py-12">
      {/* Previous */}
      <button
        className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors ${
          page <= 1
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        }`}
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        data-action="shop_prev_page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      {/* Page numbers */}
      {pages.map((p) => (
        <button
          key={p}
          className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-medium transition-colors ${
            p === page
              ? "bg-black text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
          onClick={() => goToPage(p)}
          aria-current={p === page ? "page" : undefined}
          aria-label={`Page ${p}`}
          data-action={`shop_page_${p}`}
        >
          {p}
        </button>
      ))}

      {/* Next */}
      <button
        className={`w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors ${
          page >= totalPages
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-100"
        }`}
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        data-action="shop_next_page"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
        </svg>
      </button>
    </nav>
  );
};

export default Pagination;
