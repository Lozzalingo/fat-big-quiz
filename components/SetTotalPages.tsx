"use client";
import { useEffect } from "react";
import { usePaginationStore } from "@/app/store/paginationStore";

/**
 * Invisible client component rendered by the server-side Products component.
 * Syncs the total page count from the API into the Zustand pagination store.
 */
const SetTotalPages = ({ totalPages }: { totalPages: number }) => {
  const setTotalPages = usePaginationStore((s) => s.setTotalPages);

  useEffect(() => {
    setTotalPages(totalPages);
  }, [totalPages, setTotalPages]);

  return null;
};

export default SetTotalPages;
