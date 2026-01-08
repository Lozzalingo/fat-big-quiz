import { BlogSection, Newsletter } from "@/components";
import MainHeaderClient from "@/components/MainHeaderClient";
import { ProductShowcase } from "@/components/landing";
import Link from "next/link";
import { getHomepageCardImageUrl } from "@/utils/cdn";
import { FaRocket, FaDownload } from "react-icons/fa";

export default async function Home() {
  // Fetch blog posts and homepage cards in parallel
  const [blogData, cardsData] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog?limit=3`, { cache: "no-store" })
      .then((res) => res.json())
      .catch(() => ({ posts: [] })),
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/homepage-cards/public`, { cache: "no-store" })
      .then((res) => res.json())
      .catch(() => []),
  ]);

  // Transform cards to match ProductShowcase format
  const productOfferings = (cardsData || []).map((card: any) => ({
    title: card.title,
    description: card.description,
    price: card.price,
    href: card.href,
    image: card.image
      ? card.image.startsWith("/")
        ? card.image
        : getHomepageCardImageUrl(card.image)
      : undefined,
    badge: card.badge,
    type: card.cardType?.toLowerCase() as "download" | "subscription" | "event" | "app" | "free",
  }));

  return (
    <>
      <MainHeaderClient />

      {/* Product Showcase - Main Focus */}
      <ProductShowcase products={productOfferings} />

      {/* Simple "What's Right For You" Guide */}
      <div className="bg-white py-12 md:py-16 border-t border-border">
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-8">
            Not Sure Where to Start?
          </h2>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* For Venues */}
            <Link
              href="/weekly-pack"
              className="group p-6 bg-background rounded-xl hover:shadow-lg hover:border-primary border border-transparent transition"
            >
              <div className="text-3xl mb-3">🍺</div>
              <h3 className="font-bold text-text-primary mb-2 group-hover:text-primary transition">
                Running a Pub Quiz?
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Get fresh questions delivered weekly. Save hours of prep time.
              </p>
              <span className="text-primary text-sm font-semibold">
                Weekly Pack →
              </span>
            </Link>

            {/* For Events */}
            <Link
              href="/on-stage"
              className="group p-6 bg-background rounded-xl hover:shadow-lg hover:border-primary border border-transparent transition"
            >
              <div className="text-3xl mb-3">🎭</div>
              <h3 className="font-bold text-text-primary mb-2 group-hover:text-primary transition">
                Planning a Night Out?
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Book tickets to our live theatrical quiz experience.
              </p>
              <span className="text-primary text-sm font-semibold">
                Get Tickets →
              </span>
            </Link>

            {/* For One-off */}
            <Link
              href="/shop"
              className="group p-6 bg-background rounded-xl hover:shadow-lg hover:border-primary border border-transparent transition"
            >
              <div className="text-3xl mb-3">🎉</div>
              <h3 className="font-bold text-text-primary mb-2 group-hover:text-primary transition">
                One-Off Quiz Night?
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Download a ready-made quiz pack instantly.
              </p>
              <span className="text-primary text-sm font-semibold">
                Browse Packs →
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Blog Section - Smaller */}
      {blogData?.posts?.length > 0 && (
        <div className="bg-background py-12 md:py-16">
          <div className="max-w-screen-xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary">
                Free Quiz Content
              </h2>
              <Link
                href="/blog"
                className="text-primary font-semibold hover:underline text-sm"
              >
                View All →
              </Link>
            </div>
            <BlogSection initialPosts={blogData.posts} compact />
          </div>
        </div>
      )}

      {/* Simple CTA */}
      <div className="bg-gradient-to-r from-primary to-primary-dark py-12 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Ready to Host Your Quiz?
          </h2>
          <p className="text-white/80 mb-6 max-w-lg mx-auto">
            Try our free quiz app or browse our ready-made quiz packs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://app.fatbigquiz.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-6 py-3 rounded-lg shadow-lg hover:scale-105 transition"
            >
              <FaRocket />
              Try App Free
            </a>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-white/20 text-white font-bold px-6 py-3 rounded-lg border border-white/30 hover:bg-white/30 transition"
            >
              <FaDownload />
              Quiz Packs
            </Link>
          </div>
        </div>
      </div>

      <Newsletter />
    </>
  );
}
