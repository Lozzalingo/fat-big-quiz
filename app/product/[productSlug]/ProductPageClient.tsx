"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { FaDownload, FaCalendar, FaTicketAlt } from "react-icons/fa";

interface Product {
  id: string;
  title: string;
  price: number;
  description?: string;
  productType: string;
  mainImage?: string;
}

interface ProductPageClientProps {
  product: Product;
  productSlug: string;
  productType: string;
  features: string[];
  imageUrl?: string;
}

export default function ProductPageClient({
  product,
  productSlug,
  productType,
  features,
  imageUrl,
}: ProductPageClientProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.title,
          price: product.price,
          productType: productType,
          slug: productSlug,
          imageUrl: imageUrl,
          description: product.description,
          // Pass user email if logged in (locks email in Stripe checkout)
          email: session?.user?.email || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Checkout failed");
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "An error occurred during checkout");
      setIsLoading(false);
    }
  };

  const ctaText =
    productType === "DIGITAL_DOWNLOAD"
      ? "Buy & Download"
      : productType === "SUBSCRIPTION"
      ? "Subscribe"
      : "Book Now";

  const Icon =
    productType === "DIGITAL_DOWNLOAD"
      ? FaDownload
      : productType === "SUBSCRIPTION"
      ? FaCalendar
      : FaTicketAlt;

  return (
    <div className="space-y-3">
      <button
        onClick={handleCheckout}
        disabled={isLoading}
        className="w-full bg-primary text-white text-xs font-medium uppercase tracking-wide py-3.5 flex items-center justify-center gap-2 transition-all hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="animate-pulse">Processing...</span>
        ) : (
          <>
            <Icon className="text-xs" />
            {ctaText} — £{product.price}
          </>
        )}
      </button>

      {error && (
        <div className="border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-[10px] text-red-400 hover:text-red-600 mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        {productType === "DIGITAL_DOWNLOAD"
          ? "Instant download after purchase"
          : "Secure checkout with Stripe"}
      </p>
    </div>
  );
}
