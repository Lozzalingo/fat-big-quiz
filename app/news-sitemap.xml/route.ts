/**
 * Google News Sitemap - /news-sitemap.xml
 * Lists articles published in the last 48 hours (Google News requirement)
 */

import { NextResponse } from "next/server";

const BASE_URL = "https://fatbigquiz.com";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || BASE_URL;

export async function GET() {
  let articles: any[] = [];

  try {
    const res = await fetch(`${API_BASE_URL}/api/blog`, {
      next: { revalidate: 900 }, // 15 min cache
    });
    if (res.ok) {
      const data = await res.json();
      const posts = Array.isArray(data) ? data : data.posts || [];

      // Filter to published posts from last 48 hours
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      articles = posts.filter(
        (p: any) => p.published && new Date(p.createdAt) > cutoff
      );
    }
  } catch (error) {
    console.error("[Sitemap] Error fetching blog posts for news sitemap:", error);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
  .map(
    (post: any) => `  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Fat Big Quiz</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(post.createdAt).toISOString()}</news:publication_date>
      <news:title>${escapeXml(post.title)}</news:title>
    </news:news>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
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
