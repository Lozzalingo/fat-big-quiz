// No 'use client' here — this is a Server Component
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, User, Tag, Clock, Eye, MessageCircle } from "lucide-react";
import BlogPostClient from "@/components/Blog/BlogPostClient";
import { getBlogImageUrl, getUserAvatarUrl } from "@/utils/cdn";

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
    firstName?: string | null;
    avatar?: string | null;
    bio?: string | null;
  };
  category?: {
    name: string;
  };
  tags?: Array<{ name: string }>;
  readTime?: number;
  viewCount?: number;
};

export default async function BlogPostPage({ params }: { params: { blogSlug: string } }) {
  const slug = params.blogSlug;
  const postsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog`, {
    next: { revalidate: 3600 }
  });

  if (!postsResponse.ok) return notFound();

  const data = await postsResponse.json();
  const posts = data.posts || [];
  const post = posts.find((p: BlogPost) => p.slug === slug);
  if (!post) return notFound();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const readTime = post.readTime || Math.ceil(post.content.split(/\s+/).length / 200);
  const imageSrc = getBlogImageUrl(post.coverImage);

  return (
    <main className="bg-background min-h-screen pb-16">
      {/* Hero Header */}
      <div className="relative w-full h-96 md:h-[500px]">
        <img
          src={imageSrc}
          alt={post.title}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          className="brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-primary-dark/40 to-primary-dark/80" />
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-16 text-white">
          <div className="max-w-4xl mx-auto">
            {post.category && (
              <Link href={`/category/${post.category.name.toLowerCase()}`} className="inline-block">
                <span className="bg-primary text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4 hover:bg-primary-dark transition-colors inline-block">
                  {post.category.name}
                </span>
              </Link>
            )}
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-white mt-3">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm md:text-base">
              {post.author?.firstName && (
                <div className="flex items-center">
                  <User size={16} className="mr-2" />
                  <span>{post.author.firstName}</span>
                </div>
              )}
              <div className="flex items-center">
                <Calendar size={16} className="mr-2" />
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <div className="flex items-center">
                <Clock size={16} className="mr-2" />
                <span>{readTime} min read</span>
              </div>
              {post.viewCount && (
                <div className="flex items-center">
                  <Eye size={16} className="mr-2" />
                  <span>{post.viewCount} views</span>
                </div>
              )}
              <div className="flex items-center">
                <MessageCircle size={16} className="mr-2" />
                <Link href="#comments" className="hover:text-white transition-colors">
                  <span>Comments</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden transform -mt-16 relative z-10 border border-border">
          {post.author?.avatar && (
            <div className="absolute -top-12 right-10">
              <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img
                  src={getUserAvatarUrl(post.author.avatar)}
                  alt={post.author.firstName || "Author"}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="px-8 pt-8 pb-4 border-b border-border">
              <div className="flex items-center flex-wrap gap-2">
                {post.tags.map((tag: { name: string }) => (
                  <span key={tag.name} className="bg-primary/10 text-primary text-sm px-3 py-1 rounded-full inline-flex items-center font-medium">
                    <Tag size={14} className="mr-1" />
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="p-8 prose prose-lg max-w-none prose-headings:text-text-primary prose-p:text-text-secondary prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-text-primary" dangerouslySetInnerHTML={{ __html: post.content }} />
        </div>

        {/* Back to Blog Link */}
        <div className="mt-8 text-center">
          <Link href="/blog" className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-dark transition-colors">
            ← Back to Blog
          </Link>
        </div>
      </div>

      <BlogPostClient postId={post.id} />
    </main>
  );
}