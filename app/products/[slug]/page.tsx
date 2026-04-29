import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  FaArrowLeft,
  FaDesktop,
  FaMapMarkerAlt,
  FaRandom,
  FaArrowRight,
} from "react-icons/fa";

const KALLUNA_API = process.env.NEXT_PUBLIC_KALLUNA_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3007";
const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const KALLUNA_FOLDER = "kalluna";

interface Variant {
  id: string;
  slug: string;
  title: string;
  mainImage: string;
  price: number;
  variantLabel: string | null;
  eventFormat: string | null;
  productType: string;
}

interface ParentProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  mainImage: string;
  eventFormat: string | null;
  isParent: boolean;
  variantCount: number;
  variants: Variant[];
}

function getImageUrl(filename: string | null): string {
  if (!filename) return "https://placehold.co/800x400?text=Fat+Big+Quiz";
  if (filename.startsWith("http")) return filename;
  return `${CDN}/${KALLUNA_FOLDER}/experiences/${filename}`;
}

/* Map Kalluna variant → FBQ Variant format */
function mapVariant(v: Record<string, unknown>): Variant {
  return {
    id: v.id as string,
    slug: v.slug as string,
    title: v.title as string,
    mainImage: v.coverImage as string,
    price: ((v.price as number) || 0) / 100,
    variantLabel: v.variantLabel as string | null,
    eventFormat: v.format as string | null,
    productType: "EVENT",
  };
}

const formatBadge: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  VIRTUAL: { label: "Virtual", color: "bg-blue-100 text-blue-700", icon: <FaDesktop className="text-xs" /> },
  IN_PERSON: { label: "In-Person", color: "bg-green-100 text-green-700", icon: <FaMapMarkerAlt className="text-xs" /> },
  HYBRID: { label: "Hybrid", color: "bg-purple-100 text-purple-700", icon: <FaRandom className="text-xs" /> },
};

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  try {
    const res = await fetch(`${KALLUNA_API}/api/experiences/slug/${params.slug}`, { cache: "no-store" });
    if (res.ok) {
      const exp = await res.json();
      const plainDesc = (exp.description || "").replace(/<[^>]+>/g, " ").trim().slice(0, 160);
      return {
        title: `${exp.title} - Fat Big Quiz`,
        description: plainDesc,
        openGraph: {
          title: `${exp.title} - Fat Big Quiz`,
          description: plainDesc,
          images: [getImageUrl(exp.coverImage)],
        },
      };
    }
  } catch {}
  return { title: "Fat Big Quiz" };
}

export default async function ProductSlugPage({ params }: { params: { slug: string } }) {
  let parent: ParentProduct | null = null;
  try {
    const res = await fetch(`${KALLUNA_API}/api/experiences/slug/${params.slug}`, { cache: "no-store" });
    if (res.ok) {
      const exp = await res.json();
      if (exp.isParent) {
        parent = {
          id: exp.id,
          slug: exp.slug,
          title: exp.title,
          description: exp.description || exp.shortDesc || "",
          mainImage: exp.coverImage,
          eventFormat: exp.format,
          isParent: true,
          variantCount: (exp.variants || []).length,
          variants: (exp.variants || []).map(mapVariant),
        };
        console.log(`[FBQ Products] Loaded parent "${exp.title}" with ${parent.variantCount} variants from Kalluna`);
      }
    }
  } catch (err) {
    console.error("[FBQ Products] Failed to fetch from Kalluna:", err);
  }

  // Not a parent product - redirect to existing product detail page
  if (!parent) {
    redirect(`/product/${params.slug}`);
  }

  return (
    <>
      {/* Hero */}
      <section className="relative">
        <div className="h-64 md:h-80 overflow-hidden">
          <img
            src={getImageUrl(parent.mainImage)}
            alt={parent.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-screen-xl mx-auto px-4 pb-8">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-white/80 text-sm mb-3 hover:text-white transition"
              data-action="product_parent_back"
            >
              <FaArrowLeft className="text-xs" /> All Experiences
            </Link>
            <h1 className="font-poppins text-3xl md:text-5xl font-bold text-white">
              {parent.title}
            </h1>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="bg-white py-10 md:py-14">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-6">
              {Object.entries(formatBadge).map(([key, { label, color, icon }]) => (
                <span
                  key={key}
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full ${color}`}
                >
                  {icon} {label}
                </span>
              ))}
            </div>
            <div
              className="prose prose-lg text-gray-600"
              dangerouslySetInnerHTML={{ __html: parent.description }}
            />
          </div>
        </div>
      </section>

      {/* Variants Grid */}
      <section className="bg-gray-50 py-10 md:py-16">
        <div className="max-w-screen-xl mx-auto px-4">
          <h2 className="font-poppins text-2xl font-bold text-gray-900 mb-2">
            Choose Your {parent.title}
          </h2>
          <p className="text-gray-500 mb-8">
            {parent.variantCount > 0
              ? `${parent.variantCount} option${parent.variantCount !== 1 ? "s" : ""} available`
              : "More options coming soon"}
          </p>

          {parent.variants.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {parent.variants.map((variant) => (
                <Link
                  key={variant.id}
                  href={`/product/${variant.slug}`}
                  className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 border border-gray-200"
                  data-action={`product_variant_${variant.slug}`}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getImageUrl(variant.mainImage)}
                      alt={variant.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {variant.eventFormat && formatBadge[variant.eventFormat] && (
                      <span
                        className={`absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${formatBadge[variant.eventFormat].color}`}
                      >
                        {formatBadge[variant.eventFormat].icon}
                        {formatBadge[variant.eventFormat].label}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    {variant.variantLabel && (
                      <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mb-2 inline-block">
                        {variant.variantLabel}
                      </span>
                    )}
                    <h3 className="font-poppins font-semibold text-lg text-gray-900 mb-2 group-hover:text-orange-500 transition-colors">
                      {variant.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      {variant.price > 0 && (
                        <span className="font-bold text-gray-900">
                          &pound;{variant.price.toFixed(2)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-orange-500 font-medium text-sm">
                        View Details <FaArrowRight className="text-xs" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 mb-4">
                We&apos;re adding new options all the time. Get in touch to
                discuss your event.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-6 py-3 rounded-lg hover:bg-orange-600 transition"
                data-action="product_variant_empty_contact"
              >
                Get a Quote
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="shimmer-bg text-white py-12">
        <div className="max-w-screen-xl mx-auto px-4 text-center">
          <h2 className="font-poppins text-2xl font-bold mb-3">
            Need Something Custom?
          </h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            We can tailor any {parent.title.toLowerCase()} to your group,
            theme, and budget.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-8 py-4 rounded-lg text-lg hover:bg-orange-600 transition-all shadow-lg"
            data-action="product_parent_bottom_cta"
          >
            Get a Quote
          </Link>
        </div>
      </section>
    </>
  );
}
