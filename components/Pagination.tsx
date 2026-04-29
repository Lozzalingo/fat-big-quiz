// *********************
// Role of the component: Numbered pagination for navigating the shop page
// Name of the component: Pagination.tsx
// Version: 2.0
// Component call: <Pagination />
// Output: Numbered page buttons with prev/next arrows, Etsy-style
// *********************

"use client";
import { usePaginationStore } from "@/app/store/paginationStore";
import { useSearchParams, useRouter } from "next/navigation";
import React, { useCallback, useMemo } from "react";

/**
 * Build the array of page numbers to display.
 * Shows first, last, current, and neighbours with ellipsis gaps.
 * Example for page 5 of 10: [1, '...', 4, 5, 6, '...', 10]
 */
function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  // Always show first page
  pages.push(1);

  if (current > 3) {
    pages.push("...");
  }

  // Pages around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  // Always show last page
  pages.push(total);

  return pages;
}

const Pagination = () => {
  const { page, totalPages, setPage } = usePaginationStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const goToPage = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === page) return;

      setPage(newPage);

      // Update the URL query string so the server component re-fetches
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(newPage));
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [page, totalPages, setPage, searchParams, router]
  );

  const pages = useMemo(() => buildPageRange(page, totalPages), [page, totalPages]);

  // Hide pagination if only one page
  if (totalPages <= 1) return null;

  const btnBase =
    "border border-primary text-xs font-medium uppercase tracking-wide px-4 py-2.5 transition-colors";
  const btnActive = "bg-primary text-white";
  const btnInactive = "bg-white text-primary hover:bg-primary hover:text-white";
  const btnDisabled = "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed";

  return (
    <nav aria-label="Shop pagination" className="flex justify-center items-center gap-1 py-12">
      {/* Previous arrow */}
      <button
        className={`${btnBase} ${page <= 1 ? btnDisabled : btnInactive}`}
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        data-track-button="Shop:Previous Page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 inline-block"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>

      {/* Page numbers */}
      {pages.map((p, idx) =>
        p === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="px-3 py-2.5 text-xs text-gray-400 select-none"
          >
            ...
          </span>
        ) : (
          <button
            key={p}
            className={`${btnBase} ${p === page ? btnActive : btnInactive}`}
            onClick={() => goToPage(p as number)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            data-track-button={`Shop:Page ${p}`}
          >
            {p}
          </button>
        )
      )}

      {/* Next arrow */}
      <button
        className={`${btnBase} ${page >= totalPages ? btnDisabled : btnInactive}`}
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        data-track-button="Shop:Next Page"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="w-4 h-4 inline-block"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
        </svg>
      </button>
    </nav>
  );
};

export default Pagination;
