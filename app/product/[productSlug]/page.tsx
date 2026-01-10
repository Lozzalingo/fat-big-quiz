import {
  StockAvailability,
  SingleProductRating,
  ProductTabs,
  SingleProductDynamicFields,
  AddToWishlistBtn,
} from "@/components";
import { HeroSection, FeaturesGrid, PricingSection, FAQSection } from "@/components/landing";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";
import { FaCheck, FaDownload, FaCalendar, FaPlay, FaRocket, FaBook, FaArrowRight } from "react-icons/fa";
import ProductPageClient from "./ProductPageClient";
import ProductImageGallery from "./ProductImageGallery";
import { getProductImageUrl } from "@/utils/cdn";
import { Metadata } from "next";
import Script from "next/script";

// Generate JSON-LD structured data for product
function generateProductSchema(product: any, productSlug: string) {
  const imageUrl = getProductImageUrl(product.mainImage);
  const productUrl = `https://fatbigquiz.com/product/${productSlug}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": product.description?.slice(0, 500) || `Get ${product.title} from Fat Big Quiz`,
    "image": imageUrl,
    "url": productUrl,
    "brand": {
      "@type": "Brand",
      "name": "Fat Big Quiz"
    },
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "GBP",
      "price": product.price,
      "availability": product.inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": "Fat Big Quiz"
      }
    },
    ...(product.rating > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.rating,
        "bestRating": 5,
        "worstRating": 1,
        "ratingCount": 1
      }
    }),
    ...(product.quizFormat && {
      "category": product.quizFormat.displayName
    })
  };
}

interface SingleProductPageProps {
  params: Promise<{
    productSlug: string;
  }>;
}

// Generate metadata for social sharing (WhatsApp, Facebook, Twitter, etc.)
export async function generateMetadata({ params }: SingleProductPageProps): Promise<Metadata> {
  const { productSlug } = await params;

  const data = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/slugs/${productSlug}`,
    { cache: "no-store" }
  );
  const product = await data.json();

  if (!product || product.error) {
    return { title: "Product Not Found" };
  }

  const imageUrl = getProductImageUrl(product.mainImage);
  const productUrl = `https://fatbigquiz.com/product/${productSlug}`;

  return {
    title: `${product.title} | Fat Big Quiz`,
    description: product.description?.slice(0, 160) || `Get ${product.title} from Fat Big Quiz`,
    openGraph: {
      title: product.title,
      description: product.description?.slice(0, 160) || `Get ${product.title} from Fat Big Quiz`,
      url: productUrl,
      siteName: "Fat Big Quiz",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
      locale: "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description?.slice(0, 160) || `Get ${product.title} from Fat Big Quiz`,
      images: [imageUrl],
    },
  };
}

// Parse features from JSON or newline-separated string
function parseFeatures(features: string | null | undefined): string[] {
  if (!features) return [];
  try {
    const parsed = JSON.parse(features);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return features.split("\n").filter((f) => f.trim());
  }
}

// Parse download files and count by extension
function parseDownloadFiles(downloadFile: string | null | undefined): { extension: string; count: number }[] {
  if (!downloadFile) return [];
  try {
    const files = JSON.parse(downloadFile);
    if (!Array.isArray(files)) return [];

    // Count files by extension
    const extCounts: Record<string, number> = {};
    files.forEach((file: string) => {
      const ext = file.split('.').pop()?.toUpperCase() || 'FILE';
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    });

    // Convert to array sorted by count descending
    return Object.entries(extCounts)
      .map(([extension, count]) => ({ extension, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}

const SingleProductPage = async ({ params }: SingleProductPageProps) => {
  const { productSlug } = await params;

  const data = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/slugs/${productSlug}`,
    { cache: "no-store" }
  );
  const product = await data.json();

  if (!product || product.error) {
    notFound();
  }

  const productType = product.productType || "PHYSICAL";
  const isDigitalProduct = productType === "DIGITAL_DOWNLOAD";
  const isSubscription = productType === "SUBSCRIPTION";
  const isEvent = productType === "EVENT";
  const isLandingPageStyle = isDigitalProduct || isSubscription || isEvent;
  const features = parseFeatures(product.features);
  const fileTypes = parseDownloadFiles(product.downloadFile);

  const getImageSrc = (imageName: string | undefined) => {
    return getProductImageUrl(imageName);
  };

  // Generate structured data
  const productSchema = generateProductSchema(product, productSlug);

  // For landing page style products
  if (isLandingPageStyle) {
    const productImages = product.images || [];

    return (
      <div className="bg-white">
        {/* Structured Data */}
        <Script
          id="product-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />

        {/* Breadcrumb */}
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <Link href="/shop" className="hover:text-primary transition-colors">Shop</Link>
            <span>/</span>
            <span className="text-gray-900">{product.title}</span>
          </nav>
        </div>

        {/* Main Product Section */}
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 pb-16">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Image Gallery (takes 2 columns) */}
            <div className="lg:col-span-2">
              <ProductImageGallery
                mainImage={product.mainImage}
                images={productImages}
                quizFormat={product.quizFormat}
                title={product.title}
              />
            </div>

            {/* Right - Product Info (takes 1 column) */}
            <div className="flex flex-col">
              {/* Badge */}
              <span className="text-[10px] font-medium uppercase tracking-widest text-primary mb-3">
                {isDigitalProduct ? "Instant Download" : isSubscription ? "Subscription" : "Live Event"}
              </span>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight mb-4">
                {product.title}
              </h1>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-3 h-3 ${star <= product.rating ? "text-yellow-400" : "text-gray-300"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">({product.rating})</span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                <span className="text-2xl font-semibold text-gray-900">£{product.price}</span>
                {isSubscription && <span className="text-sm text-gray-500 ml-1">/month</span>}
              </div>

              {/* Description - Collapsible */}
              {product.description && (
                <details className="mb-6 group">
                  <summary className="flex items-center justify-between cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-gray-900 py-2 border-b border-gray-200 list-none">
                    About This {isDigitalProduct ? "Quiz Pack" : isSubscription ? "Subscription" : "Event"}
                    <span className="text-gray-400 group-open:rotate-45 transition-transform text-sm">+</span>
                  </summary>
                  <p className="text-sm text-gray-600 leading-relaxed pt-4 whitespace-pre-wrap">
                    {product.description}
                  </p>
                </details>
              )}

              {/* What's Included */}
              {(features.length > 0 || fileTypes.length > 0) && (
                <div className="mb-8">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-gray-900 mb-3">
                    What's Included
                  </h3>
                  <ul className="space-y-2">
                    {/* Digital file types */}
                    {fileTypes.length > 0 && (
                      <li className="flex items-start gap-2">
                        <FaDownload className="text-primary text-xs mt-1 flex-shrink-0" />
                        <span className="text-xs text-gray-700">
                          Digital file type{fileTypes.length > 1 || fileTypes[0]?.count > 1 ? 's' : ''}: {fileTypes.map(ft => `${ft.count} ${ft.extension}`).join(', ')}
                        </span>
                      </li>
                    )}
                    {/* Instant download for digital products */}
                    {isDigitalProduct && (
                      <li className="flex items-start gap-2">
                        <FaCheck className="text-primary text-xs mt-1 flex-shrink-0" />
                        <span className="text-xs text-gray-700">Instant digital download</span>
                      </li>
                    )}
                    {/* Features from product */}
                    {features.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <FaCheck className="text-primary text-xs mt-1 flex-shrink-0" />
                        <span className="text-xs text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA Button */}
              <div id="pricing" className="mt-auto">
                <ProductPageClient
                  product={product}
                  productSlug={productSlug}
                  productType={productType}
                  features={features}
                  imageUrl={getProductImageUrl(product.mainImage)}
                />
              </div>

              {/* Payment Icons */}
              <div className="flex gap-2 mt-6">
                <img src="/visa.svg" alt="visa" className="h-6 opacity-50" />
                <img src="/mastercard.svg" alt="mastercard" className="h-6 opacity-50" />
                <img src="/ae.svg" alt="american express" className="h-6 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Video Section */}
        {product.videoUrl && (
          <div className="py-16 bg-white">
            <div className="max-w-screen-lg mx-auto px-4 md:px-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-900 border-b border-gray-900 pb-2 mb-6">
                Preview
              </h2>
              <div className="aspect-video overflow-hidden border border-gray-200">
                <iframe
                  src={product.videoUrl.replace("watch?v=", "embed/")}
                  title={product.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="py-16 bg-gray-50">
          <div className="max-w-screen-lg mx-auto px-4 md:px-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-900 border-b border-gray-900 pb-2 mb-6">
              FAQ
            </h2>
            <div className="space-y-6">
              {[
                {
                  question: isDigitalProduct
                    ? "How do I receive my download?"
                    : isSubscription
                    ? "How does the subscription work?"
                    : "How do I receive my tickets?",
                  answer: isDigitalProduct
                    ? "After completing your purchase, you'll be immediately redirected to a download page. You'll also receive an email with your download link."
                    : isSubscription
                    ? "Once subscribed, you'll receive access to new content on a regular basis. You can cancel anytime."
                    : "After booking, you'll receive a confirmation email with your tickets and event details.",
                },
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept all major credit cards (Visa, Mastercard, American Express) as well as Apple Pay and Google Pay through Stripe.",
                },
                {
                  question: "Can I get a refund?",
                  answer: isDigitalProduct
                    ? "Due to the digital nature of our products, we don't offer refunds once downloaded. Contact support if you have issues."
                    : "Refunds are available up to 48 hours before your event.",
                },
              ].map((faq, index) => (
                <details key={index} className="group">
                  <summary className="flex items-center justify-between cursor-pointer text-sm font-medium text-gray-900 py-3 border-b border-gray-200 list-none">
                    {faq.question}
                    <span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="text-xs text-gray-600 leading-relaxed py-4">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Traditional product page for physical products
  return (
    <div className="bg-white">
      {/* Structured Data */}
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />

      <div className="max-w-screen-2xl mx-auto">
        <div className="flex justify-center gap-x-16 pt-10 max-lg:flex-col items-center gap-y-5 px-5">
          <div>
            <img
              src={getImageSrc(product.mainImage)}
              alt={product.title}
              className="w-[500px] h-[500px] object-contain"
            />
          </div>
          <div className="flex flex-col gap-y-7 text-black max-[500px]:text-center">
            <SingleProductRating rating={product?.rating} />
            <h1 className="text-3xl">{product?.title}</h1>
            <p className="text-xl font-semibold">£{product?.price}</p>
            <StockAvailability stock={94} inStock={product?.inStock} />
            <SingleProductDynamicFields product={product} />
            <div className="flex flex-col gap-y-2 max-[500px]:items-center">
              <AddToWishlistBtn product={product} slug={productSlug} />
              <div className="flex gap-x-2 mt-4">
                <img src="/visa.svg" alt="visa" className="h-8" />
                <img src="/mastercard.svg" alt="mastercard" className="h-8" />
                <img src="/ae.svg" alt="american express" className="h-8" />
                <img src="/paypal.svg" alt="paypal" className="h-8" />
              </div>
            </div>
          </div>
        </div>
        <div className="py-16">
          <ProductTabs product={product} />
        </div>
      </div>
    </div>
  );
};

export default SingleProductPage;
