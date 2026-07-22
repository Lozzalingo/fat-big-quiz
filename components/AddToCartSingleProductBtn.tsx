"use client";

import React from "react";
import { useProductStore } from "@/app/store/store";
import toast from "react-hot-toast";
import { SingleProductBtnProps } from "@/types/products";

const AddToCartSingleProductBtn = ({ product, quantityCount } : SingleProductBtnProps) => {
  const { addToCart, calculateTotals, openSidebar } = useProductStore();

  const handleAddToCart = () => {
    addToCart({
      id: product?.id.toString(),
      title: product?.title,
      price: product?.price,
      image: product?.mainImage,
      amount: quantityCount
    });
    calculateTotals();
    openSidebar();
    console.log("[Cart] Product added to cart:", product?.title);
  };
  return (
    <button
      onClick={handleAddToCart}
      data-track-button="Product:Add to Cart"
      className="btn w-[200px] text-lg border border-gray-300 border-1 font-normal bg-white text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 hover:scale-110 transition-all uppercase ease-in max-[500px]:w-full"
    >
      Add to cart
    </button>
  );
};

export default AddToCartSingleProductBtn;
