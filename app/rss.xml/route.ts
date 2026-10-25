/**
 * RSS Feed - /rss.xml
 * Proxies the blog service RSS feed for Fat Big Quiz (site_id 2).
 * Falls back to a locally generated feed if the blog service is unavailable.
 */

import { NextResponse } from "next/server";

const BASE_URL = "https://fatbigquiz.com";
const BLOG_SERVICE_URL = process.env.BLOG_SERVICE_URL || "";
const BLOG_SITE_ID = process.env.BLOG_SITE_ID || "2";

export async function GET() {
  // Try blog service RSS first
  if (BLOG_SERVICE_URL) {
    try {
      const res = await fetch(`${BLOG_SERVICE_URL}/api/blog/rss/${BLOG_SITE_ID}`, {
        headers: { "User-Agent": "FatBigQuiz-RSS/1.0" },
        next: { revalidate: 900 },
      });
      if (res.ok) {
        const xml = await res.text();
        return new NextResponse(xml, {
          headers: {
            "Content-Type": "application/rss+xml; charset=utf-8",
            "Cache-Control": "public, max-age=900, s-maxage=900",
          },
        });
      }
    } catch (error) {
      console.error("[BLOG] RSS: blog service unavailable, generating locally:", error);
    }
  }

  // Fallback: generate RSS from local API
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || BASE_URL;
  let articles: any[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/blog?limit=50`, {
      next: { revalidate: 900 },
    });
    if (res.ok) {
      const data = await res.json();
      articles = (Array.isArray(data) ? data : data.posts || []).filter(
        (p: any) => p.published
      );
    }
  } catch (error) {
    console.error("[BLOG] RSS fallback fetch error:", error);
  }

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fat Big Quiz Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Quiz tips, trivia, and pub quiz resources from Fat Big Quiz</description>
    <language>en-gb</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${articles
  .map(
    (post: any) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.createdAt).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt || post.metaDescription || "")}</description>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=900, s-maxage=900",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
