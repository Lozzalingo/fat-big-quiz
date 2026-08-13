"use client";

import { useWishlistStore } from "@/app/store/wishlistStore";
import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaHeartCrack } from "react-icons/fa6";
import { FaHeart } from "react-icons/fa6";
import { Product } from "@/types/products";
import { getApiBaseUrl } from "@/utils/api";

interface AddToWishlistBtnProps {
  product: Product;
  slug: string;
}

const AddToWishlistBtn = ({ product, slug }: AddToWishlistBtnProps) => {
  const { data: session, status } = useSession();
  const { addToWishlist, removeFromWishlist, wishlist } = useWishlistStore();
  const [isProductInWishlist, setIsProductInWishlist] = useState<boolean>();

  const addToWishlistFun = async () => {
    if (!session?.user?.email) {
      toast.error("You need to be logged in to add a product to the wishlist");
      return;
    }
    try {
      const userRes = await fetch(`${getApiBaseUrl()}/api/users/email/${session.user.email}`, {
        cache: "no-store",
      });
      const userData = await userRes.json();
      await fetch(`${getApiBaseUrl()}/api/wishlist`, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product?.id, userId: userData?.id }),
      });
      addToWishlist({
        id: product?.id,
        title: product?.title,
        price: product?.price,
        image: product?.mainImage,
        slug: product?.slug,
        stockAvailability: product?.inStock,
      });
      toast.success("Product added to the wishlist");
    } catch (error) {
      console.error("[Wishlist] Failed to add product to wishlist:", error);
      toast.error("Failed to add product to the wishlist");
    }
  };

  const removeFromWishlistFun = async () => {
    if (!session?.user?.email) return;
    try {
      const userRes = await fetch(`${getApiBaseUrl()}/api/users/email/${session.user.email}`, {
        cache: "no-store",
      });
      const userData = await userRes.json();
      await fetch(`${getApiBaseUrl()}/api/wishlist/${userData?.id}/${product?.id}`, {
        method: "DELETE",
      });
      removeFromWishlist(product?.id);
      toast.success("Product removed from the wishlist");
    } catch (error) {
      console.error("[Wishlist] Failed to remove product from wishlist:", error);
      toast.error("Failed to remove product from the wishlist");
    }
  };

  const isInWishlist = async () => {
    if (!session?.user?.email) return;
    try {
      const userRes = await fetch(`${getApiBaseUrl()}/api/users/email/${session.user.email}`, {
        cache: "no-store",
      });
      const userData = await userRes.json();
      const wishlistRes = await fetch(
        `${getApiBaseUrl()}/api/wishlist/${userData?.id}/${product?.id}`
      );
      const wishlistData = await wishlistRes.json();
      setIsProductInWishlist(!!wishlistData[0]?.id);
    } catch (error) {
      console.error("[Wishlist] Failed to check wishlist status:", error);
    }
  };

  useEffect(() => {
    isInWishlist();
  }, [session?.user?.email, wishlist]);

  return (
    <>
      {isProductInWishlist ? (
        <p
          className="flex items-center gap-x-2 cursor-pointer"
          onClick={removeFromWishlistFun}
        >
          <FaHeartCrack className="text-xl text-custom-black" />
          <span className="text-lg">REMOVE FROM WISHLIST</span>
        </p>
      ) : (
        <p
          className="flex items-center gap-x-2 cursor-pointer"
          onClick={addToWishlistFun}
        >
          <FaHeart className="text-xl text-custom-black" />
          <span className="text-lg">ADD TO WISHLIST</span>
        </p>
      )}
    </>
  );
};

export default AddToWishlistBtn;
