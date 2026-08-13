// No 'use client' here — this is a Server Component
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, User, Tag, Clock, Eye, MessageCircle, Share2 } from "lucide-react";
import BlogPostClient from "@/components/Blog/BlogPostClient";
import SocialShare from "@/components/Blog/SocialShare";
import { getBlogImageUrl, getUserAvatarUrl } from "@/utils/cdn";
import { formatDateUK } from "@/utils/dateFormatting";
import Script from "next/script";

function generateArticleSchema(post: BlogPost) {
  const imageUrl = post.coverImage ? getBlogImageUrl(post.coverImage) : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt || post.metaDescription || `Read ${post.title} on Fat Big Quiz`,
    "url": `https://fatbigquiz.com/blog/${post.slug}`,
    ...(imageUrl && { "image": imageUrl }),
    "datePublished": post.createdAt,
    "dateModified": post.updatedAt,
    "author": {
      "@type": "Person",
      "name": post.author?.firstName || "Fat Big Quiz",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Fat Big Quiz",
      "url": "https://fatbigquiz.com",
    },
    ...(post.category && { "articleSection": post.category.name }),
    ...(post.tags && post.tags.length > 0 && {
      "keywords": post.tags.map((t: { name: string }) => t.name).join(", "),
    }),
  };
}

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

/* --- Metadata ------------------------------------------------------------- */

export async function generateMetadata({
  params,
}: {
  params: { blogSlug: string };
}): Promise<Metadata> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog/slug/${params.blogSlug}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return { title: "Post Not Found | Fat Big Quiz" };

    const post: BlogPost = await res.json();
    const description =
      post.metaDescription ||
      post.excerpt ||
      `Read ${post.title} on the Fat Big Quiz blog.`;

    return {
      title: `${post.metaTitle || post.title} | Fat Big Quiz`,
      description,
      openGraph: {
        title: post.metaTitle || post.title,
        description,
        url: `https://fatbigquiz.com/blog/${post.slug}`,
        siteName: "Fat Big Quiz",
        images: post.coverImage
          ? [{ url: getBlogImageUrl(post.coverImage) }]
          : undefined,
        type: "article",
        publishedTime: post.createdAt,
        modifiedTime: post.updatedAt,
        locale: "en_GB",
      },
      twitter: {
        card: "summary_large_image",
        title: post.metaTitle || post.title,
        description,
        images: post.coverImage
          ? [getBlogImageUrl(post.coverImage)]
          : undefined,
      },
    };
  } catch {
    return { title: "Blog | Fat Big Quiz" };
  }
}

/* --- Page ----------------------------------------------------------------- */

export default async function BlogPostPage({ params }: { params: { blogSlug: string } }) {
  const slug = params.blogSlug;
  const postResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog/slug/${slug}`, {
    next: { revalidate: 3600 }
  });

  if (!postResponse.ok) return notFound();

  const post = await postResponse.json();
  if (!post) return notFound();

  const readTime = post.readTime || Math.ceil(post.content.split(/\s+/).length / 200);
  const imageSrc = getBlogImageUrl(post.coverImage);

  const articleSchema = generateArticleSchema(post);

  return (
    <main className="bg-background min-h-screen pb-16">
      <Script
        id="article-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      {/* Hero Header */}
      <div className="relative w-full h-96 md:h-[500px]">
        <img
          src={imageSrc}
          alt={post.title}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          className="brightness-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/70" />
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
                <span>{formatDateUK(post.createdAt)}</span>
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

        {/* Social Sharing */}
        <SocialShare
          title={post.title}
          slug={post.slug}
          excerpt={post.excerpt || post.metaDescription || ""}
        />

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