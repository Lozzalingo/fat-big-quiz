"use client";

import React from "react";
import { FaCheck, FaShoppingCart, FaDownload } from "react-icons/fa";

interface PricingSectionProps {
  price: number;
  originalPrice?: number;
  title?: string;
  description?: string;
  features: string[];
  ctaText?: string;
  onCtaClick: () => void;
  isLoading?: boolean;
  productType?: "PHYSICAL" | "DIGITAL_DOWNLOAD" | "SUBSCRIPTION" | "EVENT";
}

const PricingSection: React.FC<PricingSectionProps> = ({
  price,
  originalPrice,
  title = "What's Included",
  description,
  features,
  ctaText = "Buy Now",
  onCtaClick,
  isLoading = false,
  productType = "DIGITAL_DOWNLOAD",
}) => {
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className="bg-background py-16 md:py-24">
      <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-border">
          <div className="grid md:grid-cols-2">
            {/* Left - Features */}
            <div className="p-8 md:p-12">
              <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
                {title}
              </h2>
              {description && (
                <p className="text-text-secondary mb-6">{description}</p>
              )}

              <ul className="space-y-4">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaCheck className="text-success text-xs" />
                    </div>
                    <span className="text-text-primary">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right - Price & CTA */}
            <div className="bg-gradient-to-br from-primary to-primary-dark p-8 md:p-12 text-white flex flex-col justify-center items-center text-center">
              {discount > 0 && (
                <span className="bg-gold text-text-primary text-sm font-bold px-3 py-1 rounded-full mb-4">
                  {discount}% OFF
                </span>
              )}

              <div className="mb-2">
                {originalPrice && (
                  <span className="text-white/50 line-through text-xl mr-2">
                    £{originalPrice}
                  </span>
                )}
                <span className="text-5xl md:text-6xl font-bold">£{price}</span>
              </div>

              <p className="text-white/70 mb-8">
                {productType === "SUBSCRIPTION"
                  ? "per month"
                  : productType === "EVENT"
                  ? "per ticket"
                  : "one-time purchase"}
              </p>

              <button
                onClick={onCtaClick}
                disabled={isLoading}
                data-track-button="Pricing:Buy Now"
                className="w-full max-w-xs bg-white text-primary font-bold py-4 px-8 rounded-lg shadow-lg transform transition hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="animate-spin">...</span>
                ) : (
                  <>
                    {productType === "DIGITAL_DOWNLOAD" ? (
                      <FaDownload />
                    ) : (
                      <FaShoppingCart />
                    )}
                    {ctaText}
                  </>
                )}
              </button>

              <p className="text-white/50 text-sm mt-4">
                {productType === "DIGITAL_DOWNLOAD"
                  ? "Instant download after purchase"
                  : "Secure checkout with Stripe"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
