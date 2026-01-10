import React from "react";
import Link from "next/link";
import ProductItemRating from "./ProductItemRating";
import { getProductImageUrl } from "@/utils/cdn";

interface QuizFormat {
  id: string;
  name: string;
  displayName: string;
}

interface Product {
  slug: string;
  title: string;
  price: number;
  rating?: number;
  mainImage?: string;
  quizFormat?: QuizFormat;
}

const ProductItem = ({ product, color }: { product: Product; color: string }) => {
  return (
    <div className="bg-white border border-gray-200 overflow-hidden transition-all duration-150 hover:border-primary group h-full flex flex-col">
      {/* Image Container */}
      <Link href={`/product/${product.slug}`} className="block relative overflow-hidden">
        <div className="bg-gray-50">
          <img
            src={getProductImageUrl(product.mainImage)}
            className="w-full h-auto transition-transform duration-300 group-hover:scale-102"
            alt={product.title || "Quiz pack"}
          />
        </div>
        {/* Quiz Format Badge */}
        {product.quizFormat?.displayName && (
          <div className="absolute top-2 left-2">
            <span className="bg-primary text-white text-[10px] font-medium tracking-wide uppercase px-2 py-1">
              {product.quizFormat.displayName}
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        <Link href={`/product/${product.slug}`}>
          <h3 className="font-medium text-gray-900 text-sm leading-tight mb-2 line-clamp-2 hover:text-primary transition-colors tracking-tight">
            {product.title}
          </h3>
        </Link>

        {/* Bottom section - pushed to bottom with mt-auto */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-3">
            <ProductItemRating productRating={product.rating ?? 0} />
            <p className="text-sm font-semibold text-gray-900 tracking-tight">
              £{product.price.toFixed(2)}
            </p>
          </div>

          <Link
            href={`/product/${product.slug}`}
            data-track-button="Shop:View Product"
            className="block w-full bg-primary text-white text-xs font-medium tracking-wide uppercase text-center py-2.5 transition-all hover:bg-primary-dark"
            aria-label={`View ${product.title}`}
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
