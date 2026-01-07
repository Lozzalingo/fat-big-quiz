"use client";
import { useWishlistStore } from "@/app/store/wishlistStore";
import Link from "next/link";
import React from "react";
import { FaHeart } from "react-icons/fa6";

const HeartElement = ({wishQuantity}: {wishQuantity: number}) => {
  return (
    <div className="relative">
      <Link href="/wishlist">
        <FaHeart className="text-base text-white" />
        <span className="block w-3 h-3 font-bold bg-red-600 text-white rounded-full flex justify-center items-center absolute top-[-8px] right-[-6px] text-[9px]">
          { wishQuantity }
        </span>
      </Link>
    </div>
  );
};

export default HeartElement;
