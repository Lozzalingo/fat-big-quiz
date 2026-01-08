"use client";

import React from "react";
import Link from "next/link";
import {
  FaArrowRight,
  FaPlay,
  FaDownload,
  FaCalendar,
  FaRocket,
  FaBook,
} from "react-icons/fa";

interface Product {
  title: string;
  description: string;
  price?: number | string;
  href: string;
  image?: string;
  icon?: React.ReactNode;
  badge?: string;
  type: "download" | "subscription" | "event" | "app" | "free";
}

interface ProductShowcaseProps {
  title?: string;
  subtitle?: string;
  products: Product[];
}

const typeConfig = {
  download: { icon: FaDownload, color: "bg-primary", label: "Download" },
  subscription: { icon: FaCalendar, color: "bg-success", label: "Subscription" },
  event: { icon: FaPlay, color: "bg-warning", label: "Event" },
  app: { icon: FaRocket, color: "bg-info", label: "App" },
  free: { icon: FaBook, color: "bg-gold", label: "Free" },
};

const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  title,
  subtitle,
  products,
}) => {
  const renderProductCard = (product: Product, index: number) => {
    const config = typeConfig[product.type];
    const Icon = config.icon;
    const isExternal = product.href.startsWith("http");

    const CardWrapper = isExternal ? "a" : Link;
    const cardProps = isExternal
      ? { href: product.href, target: "_blank", rel: "noopener noreferrer" }
      : { href: product.href };

    return (
      <CardWrapper
        key={index}
        {...(cardProps as any)}
        className="group bg-white rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-lg hover:-translate-y-1 hover:border-primary transition-all duration-300 flex flex-col"
      >
        {/* Image or Gradient Header - maintains aspect ratio */}
        {product.image ? (
          <div className="relative overflow-hidden aspect-[4/3]">
            <img
              src={product.image}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 left-2">
              <span
                className={`${config.color} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}
              >
                {product.badge || config.label}
              </span>
            </div>
          </div>
        ) : (
          <div
            className={`${config.color} flex items-center justify-center relative aspect-[4/3]`}
          >
            <Icon className="text-4xl text-white/30" />
            <div className="absolute top-2 left-2">
              <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                {product.badge || config.label}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-sm sm:text-base text-text-primary group-hover:text-primary transition-colors mb-1">
            {product.title}
          </h3>

          <p className="text-text-secondary text-xs sm:text-sm mb-3 line-clamp-2 flex-1">
            {product.description}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <span className="text-base sm:text-lg font-bold text-primary">
              {typeof product.price === "number"
                ? `£${product.price}`
                : product.price || "Free"}
            </span>
            <span className="text-primary font-semibold flex items-center gap-1 text-xs sm:text-sm group-hover:gap-2 transition-all">
              {product.type === "app" ? "Launch" : "View"}{" "}
              <FaArrowRight className="text-xs" />
            </span>
          </div>
        </div>
      </CardWrapper>
    );
  };

  return (
    <div className="bg-background py-10 md:py-16" id="products">
      <div className="max-w-screen-xl mx-auto px-4">
        {(title || subtitle) && (
          <div className="text-center mb-8 md:mb-10">
            {title && (
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-base md:text-lg text-text-secondary max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* All Products - Uniform Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {products.map((product, index) => renderProductCard(product, index))}
        </div>
      </div>
    </div>
  );
};

export default ProductShowcase;
