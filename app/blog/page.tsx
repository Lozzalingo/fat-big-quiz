"use client";

import React, { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { motion, AnimatePresence } from "framer-motion";
import BlogPostItem from "@/components/Blog/BlogPostItem";
import Heading from "@/components/Heading";
import { FiRefreshCw } from "react-icons/fi";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  metaTitle?: string;
  metaDescription?: string;
  authorId: string;
  categoryId?: string;
  author: {
    name?: string | null;
  };
  category?: {
    name: string;
  };
  tags?: { name: string }[];
};

type CategoryFilter = string | null;

type BlogSectionProps = {
  initialPosts?: BlogPost[];
  title?: string;
  limit?: number;
};

export default function BlogSection({ initialPosts = [], title = "NEWS", limit = 6 }: BlogSectionProps) {
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [filter, setFilter] = useState<CategoryFilter>(null);
    const [categories, setCategories] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    const { ref: loadMoreRef, inView } = useInView({
      threshold: 0.5,
      triggerOnce: false,
    });

    // Utility function to format category names for display
      const formatCategoryName = (name: string): string => {
        return name
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      };

    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    };

    useEffect(() => {
      const fetchCategories = async () => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/categories?type=BLOG`
          );
          if (!response.ok) throw new Error("Failed to fetch categories");
          const data = await response.json();
          setCategories(data.map((cat: { name: string }) => cat.name) || []);
        } catch (err) {
          console.error("Failed to fetch categories:", err);
          setError("Failed to load categories.");
        }
      };
      fetchCategories();
    }, []);

    const fetchPosts = async (
      pageNum: number,
      category: CategoryFilter,
      search: string,
      reset: boolean
    ) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: pageNum.toString(),
          limit: limit.toString(),
        });
        
        // Important: Use categoryName instead of category for the filter
        if (category) params.append("categoryName", category);
        
        // Use search parameter for the backend
        if (search) params.append("search", search);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog?${params.toString()}`
        );

        if (!response.ok) throw new Error("Failed to fetch posts");

        const data = await response.json();
        // Make sure we're checking data.posts since that's what the API returns
        const newPosts = data.posts && Array.isArray(data.posts) ? data.posts : [];

        setPosts((prev) =>
          reset
            ? newPosts
            : [
                ...prev,
                ...newPosts.filter(
                  (p: BlogPost) =>
                    !prev.some((existing) => existing.id === p.id)
                ),
              ]
        );
        setHasMore(newPosts.length >= limit);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setError("Failed to load posts. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    // Reset the page and fetch posts when filter or search changes
    useEffect(() => {
      if (isInitialLoad || filter !== null || searchTerm !== "") {
        // Reset to page 1 when changing filters or search
        setPage(1);
        fetchPosts(1, filter, searchTerm, true);
        setIsInitialLoad(false);
      }
    }, [filter, searchTerm, isInitialLoad]);

    // When inView and we're past page 1, load more posts
    useEffect(() => {
      if (inView && !loading && hasMore && page > 1) {
        fetchPosts(page, filter, searchTerm, false);
      }
    }, [inView, page]);

    // Increment page when scrolling to the bottom
    useEffect(() => {
      if (inView && hasMore && !loading && page > 0) {
        const timer = setTimeout(() => {
          setPage((prev) => prev + 1);
        }, 500);
        return () => clearTimeout(timer);
      }
    }, [inView, hasMore, loading]);

    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedSearch = searchTerm.trim();
      setSearchTerm(trimmedSearch);
    };

    const handleRetry = () => {
      setPage(1);
      fetchPosts(1, filter, searchTerm, true);
    };

    return (
      <div className="bg-background min-h-screen">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary via-primary-dark to-primary py-12">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Quiz Blog</h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Tips, tricks, and trivia to help you host the perfect pub quiz
            </p>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-12" ref={ref}>
          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row justify-between items-center mb-12 gap-6">
            <div className="w-full lg:w-1/3">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-3 px-4 pr-12 bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary shadow-sm"
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors"
                  aria-label="Search"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </form>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => setFilter(null)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  filter === null
                    ? "bg-primary text-white shadow-md"
                    : "bg-white text-text-secondary border border-border hover:border-primary hover:text-primary"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setFilter(category)}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    filter === category
                      ? "bg-primary text-white shadow-md"
                      : "bg-white text-text-secondary border border-border hover:border-primary hover:text-primary"
                  }`}
                >
                  {formatCategoryName(category)}
                </button>
              ))}
            </div>
          </div>

          {searchTerm && (
            <div className="text-center mb-8">
              <p className="text-text-secondary">
                {loading && page === 1
                  ? "Searching..."
                  : `Showing results for "${searchTerm}"`}
              </p>
            </div>
          )}

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {loading && page === 1 && posts.length === 0 ? (
                <div className="col-span-full flex justify-center items-center py-16 text-text-secondary">
                  <FiRefreshCw className="animate-spin text-primary mr-2" />
                  <span>Loading posts...</span>
                </div>
              ) : error && posts.length === 0 ? (
                <div className="col-span-full text-center bg-error/10 text-error p-8 rounded-xl">
                  <p className="mb-4">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="bg-error text-white py-2 px-6 rounded-lg hover:bg-error/90 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="col-span-full text-center py-16">
                  <div className="bg-white rounded-xl p-8 border border-border">
                    <p className="text-text-secondary text-lg">No blog posts found.</p>
                  </div>
                </div>
              ) : (
                posts.map((post) => (
                  <motion.div key={post.id} variants={itemVariants}>
                    <BlogPostItem post={post} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>

          {posts.length > 0 && (
            <div className="flex justify-center py-12" ref={loadMoreRef}>
              {loading && page > 1 && (
                <div className="flex items-center text-text-secondary">
                  <FiRefreshCw className="animate-spin text-primary mr-2" />
                  <span>Loading more posts...</span>
                </div>
              )}
              {!loading && !hasMore && (
                <div className="text-center bg-white py-8 px-8 rounded-xl border border-border shadow-sm">
                  <p className="text-text-secondary mb-4">
                    You've reached the end of the blog posts
                  </p>
                  <button
                    onClick={() =>
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Back to Top
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
}