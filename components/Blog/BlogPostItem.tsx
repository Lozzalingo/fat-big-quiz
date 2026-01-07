import Link from "next/link";
import React from "react";
import { FaArrowRight, FaCalendar, FaUser } from "react-icons/fa";
import { getBlogImageUrl } from "@/utils/cdn";

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

type BlogPostItemProps = {
  post: BlogPost;
  color?: string;
  compact?: boolean;
};

const BlogPostItem: React.FC<BlogPostItemProps> = ({ post, color = "black", compact = false }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const displayExcerpt = post.excerpt || post.content.substring(0, 120) + "...";

  // Use CDN URL for the image
  const imageSrc = getBlogImageUrl(post.coverImage);

  // Compact mode - simpler card for homepage
  if (compact) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-lg hover:border-primary transition-all duration-300 group flex flex-col"
      >
        <div className="relative w-full aspect-[16/10] overflow-hidden bg-background">
          <img
            src={imageSrc}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="p-4 flex-1 flex flex-col">
          <span className="text-xs text-text-secondary mb-1">
            {formatDate(post.createdAt)}
          </span>
          <h3 className="font-bold text-text-primary mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <span className="text-primary text-sm font-semibold mt-auto flex items-center gap-1 group-hover:gap-2 transition-all">
            Read <FaArrowRight className="text-xs" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-lg hover:-translate-y-1 hover:border-primary transition-all duration-300 group">
      <Link href={`/blog/${post.slug}`}>
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-background">
          <img
            src={imageSrc}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {post.category && (
            <div className="absolute top-3 left-3">
              <span className="inline-block bg-primary text-white rounded-full px-3 py-1 text-xs font-semibold">
                {post.category.name}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div className="p-5">
        <div className="flex items-center gap-4 mb-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <FaCalendar className="text-primary" />
            {formatDate(post.createdAt)}
          </span>
          {post.author?.name && (
            <span className="flex items-center gap-1">
              <FaUser className="text-primary" />
              {post.author.name}
            </span>
          )}
        </div>

        <Link href={`/blog/${post.slug}`}>
          <h3 className="font-bold text-lg text-text-primary mb-2 line-clamp-2 hover:text-primary transition-colors duration-200">
            {post.title}
          </h3>
        </Link>

        <p className="text-text-secondary text-sm mb-4 line-clamp-3">{displayExcerpt}</p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.name}
                className="inline-block bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        <Link
          href={`/blog/${post.slug}`}
          className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-200"
        >
          Read More
          <FaArrowRight className="text-sm" />
        </Link>
      </div>
    </div>
  );
};

export default BlogPostItem;