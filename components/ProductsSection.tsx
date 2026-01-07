"use client";

import React, { forwardRef, useEffect, useState } from "react";
import ProductItem from "./ProductItem";
import Heading from "./Heading";
import GradientContainer from "./GradientContainer";
import { useScroll } from "@/utils/ScrollContext";

// Props include products to allow pre-fetching
type ProductsSectionProps = {
  initialProducts?: Product[];
};

const ProductsSection = ({ initialProducts = [] }: ProductsSectionProps) => {
  const { productsSectionRef } = useScroll();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(!initialProducts.length);

  useEffect(() => {
    // Only fetch if no initial products were provided
    if (!initialProducts.length) {
      const fetchProducts = async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products`);
          if (!response.ok) throw new Error("Failed to fetch");
          const data = await response.json();
          setProducts(data);
        } catch (error) {
          console.error("Failed to fetch products:", error);
          setProducts([]);
        } finally {
          setLoading(false);
        }
      };
      fetchProducts();
    }
  }, [initialProducts]);

  return (
    <GradientContainer>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer pointer-events-none" />
      <div className="max-w-screen-2xl mx-auto pt-0" ref={productsSectionRef} id="products-section">
        <Heading title="MERCHANDISE" />
        <div
          key={loading ? "loading" : "products"}
          className="grid grid-cols-3 justify-items-center max-w-screen-2xl mx-auto py-16 gap-x-2 px-10 gap-y-8 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1"
        >
          {loading ? (
            <div className="col-span-3 text-white text-center">
              Loading...
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-3 text-white text-center">
              No products found.
            </div>
          ) : (
            products.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                color="white"
              />
            ))
          )}
        </div>
      </div>
    </GradientContainer>
  );
};

export default ProductsSection;