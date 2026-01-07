import { BlogSection, Newsletter } from "@/components";
import MainHeaderClient from "@/components/MainHeaderClient";
import { ProductShowcase } from "@/components/landing";
import Link from "next/link";
import {
  FaRocket,
  FaPlay,
  FaDownload,
  FaCalendar,
  FaDatabase,
  FaBook,
} from "react-icons/fa";

export default async function Home() {
  const blogData = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/blog?limit=3`
  ).then((res) => res.json());

  // Define all product offerings with clear user paths
  const productOfferings = [
    {
      title: "Fat Big Quiz On Stage",
      description:
        "Live theatrical quiz experience. 90 minutes of entertainment with professional hosts and amazing prizes.",
      price: "From £15",
      href: "/on-stage",
      image: "/fat-big-quiz-event.png",
      badge: "Live Events",
      type: "event" as const,
    },
    {
      title: "Quiz App",
      description:
        "Host quizzes with timed rounds, live scoring, QR code join, and real-time leaderboards. Free to start.",
      price: "Free",
      href: "https://app.fatbigquiz.com",
      badge: "Try Free",
      type: "app" as const,
    },
    {
      title: "Weekly Quiz Pack",
      description:
        "Fresh quiz content delivered every week. Perfect for pubs and regular quiz nights.",
      price: "£4.99/mo",
      href: "/weekly-pack",
      badge: "Popular",
      type: "subscription" as const,
    },
    {
      title: "Quiz Downloads",
      description:
        "One-off quiz packs for special occasions. Instant download after purchase.",
      price: "From £4.99",
      href: "/shop",
      badge: "Instant",
      type: "download" as const,
    },
    {
      title: "Questions Database",
      description:
        "Access thousands of questions across hundreds of categories. Build your own quizzes.",
      price: "£9.99/mo",
      href: "/quiz-database",
      badge: "Pro",
      type: "subscription" as const,
    },
    {
      title: "Free Questions",
      description:
        "Browse our blog for free quiz questions, tips, and inspiration.",
      price: "Free",
      href: "/blog",
      badge: "Free",
      type: "free" as const,
    },
  ];

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
