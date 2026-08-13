import Link from "next/link";
import { Metadata } from "next";
import { FaArrowRight, FaDesktop, FaMapMarkerAlt, FaRandom } from "react-icons/fa";
import { sanitiseHtml } from "@/utils/sanitise";

const KALLUNA_API = process.env.NEXT_PUBLIC_KALLUNA_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3007";
const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const KALLUNA_FOLDER = "kalluna";

export const metadata: Metadata = {
  title: "Our Experiences - Fat Big Quiz",
  description:
    "Quizzes, game shows, and whacky wagers - virtual, in-person, or hybrid. Book the perfect entertainment for your team.",
};

interface ParentProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  mainImage: string;
  eventFormat: string | null;
  variantCount: number;
  variants: Array<{
    id: string;
    slug: string;
    title: string;
    mainImage: string;
    price: number;
    variantLabel: string | null;
    eventFormat: string | null;
  }>;
}

function getImageUrl(filename: string | null): string {
  if (!filename) return "https://placehold.co/800x400?text=Fat+Big+Quiz";
  if (filename.startsWith("http")) return filename;
  return `${CDN}/${KALLUNA_FOLDER}/experiences/${filename}`;
}

const formatIcon: Record<string, React.ReactNode> = {
  VIRTUAL: <FaDesktop className="text-sm" />,
  IN_PERSON: <FaMapMarkerAlt className="text-sm" />,
  HYBRID: <FaRandom className="text-sm" />,
};

/* Map Kalluna Experience → FBQ ParentProduct format */
function mapExperience(exp: Record<string, unknown>): ParentProduct {
  return {
    id: exp.id as string,
    slug: exp.slug as string,
    title: exp.title as string,
    description: (exp.description || exp.shortDesc || "") as string,
    mainImage: exp.coverImage as string,
    eventFormat: exp.format as string | null,
    variantCount: ((exp._count as Record<string, number>)?.variants) || 0,
    variants: [],
  };
}

export default async function ProductsPage() {
  let parents: ParentProduct[] = [];
  try {
    const res = await fetch(
      `${KALLUNA_API}/api/experiences?providerSlug=fat-big-quiz&parentsOnly=true&limit=50`,
      { next: { revalidate: 300 } }
    );
    if (res.ok) {
      const data = await res.json();
      parents = (data.experiences || []).map(mapExperience);
      console.log(`[FBQ Products] Loaded ${parents.length} parents from Kalluna API`);
    }
  } catch (err) {
    console.error("[FBQ Products] Failed to fetch from Kalluna:", err);
  }

  return (
    <>
      {/* Hero */}
      <section className="shimmer-bg text-white py-16 md:py-24">
        <div className="max-w-screen-xl mx-auto px-4 text-center">
          <h1 className="font-poppins text-3xl md:text-5xl font-bold mb-4">
            Our Experiences
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Three ways to bring the fun. Virtual, in-person, or hybrid -
            we&apos;ve got the perfect entertainment for any group.
          </p>
        </div>
      </section>

      {/* Product Cards */}
      <section className="bg-gray-50 py-12 md:py-20">
        <div className="max-w-screen-xl mx-auto px-4">
          {parents.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">
                Experiences coming soon!
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-orange-600 transition"
                data-action="products_empty_contact"
              >
                Get in Touch
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {parents.map((parent) => (
                <Link
                  key={parent.id}
                  href={`/products/${parent.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all hover:-translate-y-1 border border-gray-200"
                  data-action={`product_parent_${parent.slug}`}
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={getImageUrl(parent.mainImage)}
                      alt={parent.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h2 className="font-poppins font-bold text-2xl text-white">
                        {parent.title}
                      </h2>
                    </div>
                    {parent.variantCount > 0 && (
                      <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        {parent.variantCount} option
                        {parent.variantCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <p
                      className="text-gray-600 text-sm mb-4 line-clamp-3"
                      dangerouslySetInnerHTML={{
                        __html: sanitiseHtml(parent.description)
                          .replace(/<[^>]+>/g, " ")
                          .trim()
                          .slice(0, 200) + "...",
                      }}
                    />

                    {/* Format badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {["VIRTUAL", "IN_PERSON", "HYBRID"].map((fmt) => (
                        <span
                          key={fmt}
                          className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
                        >
                          {formatIcon[fmt]}
                          {fmt === "IN_PERSON"
                            ? "In-Person"
                            : fmt === "VIRTUAL"
                            ? "Virtual"
                            : "Hybrid"}
                        </span>
                      ))}
                    </div>

                    <span className="inline-flex items-center gap-2 text-orange-500 font-semibold text-sm group-hover:gap-3 transition-all">
                      Explore Options <FaArrowRight className="text-xs" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="shimmer-bg text-white py-12 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4 text-center">
          <h2 className="font-poppins text-2xl md:text-3xl font-bold mb-4">
            Not Sure What You Need?
          </h2>
          <p className="text-white/80 max-w-lg mx-auto mb-6">
            Tell us about your event and we&apos;ll recommend the perfect
            experience for your group.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-8 py-4 rounded-lg text-lg hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl"
            data-action="products_bottom_cta"
          >
            Get a Quote
          </Link>
        </div>
      </section>
    </>
  );
}
