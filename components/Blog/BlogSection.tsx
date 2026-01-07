"use client";

import React, { forwardRef, useEffect, useState } from "react";
import BlogPostItem from "./BlogPostItem";
import Heading from "../Heading";
import GradientContainer from "../GradientContainer";

// Define the BlogPost type based on your schema
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

// Props include blog posts to allow pre-fetching
type BlogSectionProps = {
  initialPosts?: BlogPost[];
  title?: string;
  limit?: number;
  compact?: boolean;
};

const BlogSection = forwardRef<HTMLDivElement, BlogSectionProps>(
  ({ initialPosts = [], title = "NEWS", limit = 6, compact = false }, ref) => {
    const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
    const [loading, setLoading] = useState(!initialPosts.length);

    useEffect(() => {
      // Only fetch if no initial posts were provided
      if (!initialPosts.length) {
        const fetchPosts = async () => {
          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog?limit=${limit}`
            );
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();

            // Extract posts array from the response
            setPosts(Array.isArray(data.posts) ? data.posts : []);
          } catch (error) {
            console.error("Failed to fetch blog posts:", error);
            setPosts([]); // Set as empty array if error occurs
          } finally {
            setLoading(false);
          }
        };
        fetchPosts();
      }
    }, [initialPosts, limit]);

    // Compact mode - simple grid without gradient background
    if (compact) {
      return (
        <div ref={ref}>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {loading ? (
              <div className="col-span-full text-text-secondary text-center py-8">
                Loading...
              </div>
            ) : posts.length === 0 ? (
              <div className="col-span-full text-text-secondary text-center py-8">
                No blog posts found.
              </div>
            ) : (
              posts.map((post) => (
                <BlogPostItem key={post.id} post={post} color="dark" compact />
              ))
            )}
          </div>
        </div>
      );
    }

    return (
      <GradientContainer>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
        <div className="max-w-screen-2xl mx-auto pt-0" ref={ref}>
          <Heading title={title} />
          <div
            key={loading ? "loading" : "posts"}
            className="grid grid-cols-3 justify-items-center max-w-screen-2xl mx-auto py-16 gap-x-4 px-10 gap-y-8 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
          >
            {(() => {
              if (loading) {
                return (
                  <div className="col-span-3 text-white text-center">
                    Loading...
                  </div>
                );
              }

              if (posts.length === 0) {
                return (
                  <div className="col-span-3 text-white text-center">
                    No blog posts found.
                  </div>
                );
              }

              return posts.map((post) => (
                <BlogPostItem key={post.id} post={post} color="white" />
              ));
            })()}
          </div>
        </div>
      </GradientContainer>
    );
  }
);

BlogSection.displayName = "BlogSection";

export default BlogSection;