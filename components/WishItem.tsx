"use client";

import { useWishlistStore } from "@/app/store/wishlistStore";
import { useProductStore } from "@/app/store/store";
import { useRouter } from "next/navigation";
import React from "react";
import toast from "react-hot-toast";
import { FaXmark } from "react-icons/fa6";
import { useSession } from "next-auth/react";
import { getProductImageUrl } from "@/utils/cdn";
import Link from "next/link";
import { useGetUserByEmail } from "@/hooks/useGetUserByEmail";
import { getApiBaseUrl } from "@/utils/api";

interface ProductInWishlist {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailability: number;
}

const WishItem = ({
  id,
  title,
  price,
  image,
  slug,
  stockAvailability,
}: ProductInWishlist) => {
  const { data: session } = useSession();
  const { removeFromWishlist } = useWishlistStore();
  const { addToCart, calculateTotals, openSidebar } = useProductStore();
  const router = useRouter();

  const { user } = useGetUserByEmail(session?.user?.email);
  const userId = user?.id ?? null;

  const deleteItemFromWishlist = async (productId: string) => {
    if (!userId) {
      toast.error("You need to be logged in");
      return;
    }
    try {
      await fetch(`${getApiBaseUrl()}/api/wishlist/${userId}/${productId}`, {
        method: "DELETE",
      });
      removeFromWishlist(productId);
      toast.success("Removed from wishlist");
    } catch (error) {
      console.error("[Wishlist] Failed to remove item from wishlist:", error);
      toast.error("Failed to remove item from wishlist");
    }
  };

  const handleAddToCart = () => {
    addToCart({
      id: id.toString(),
      title,
      price,
      image,
      amount: 1,
    });
    calculateTotals();
    openSidebar();
    console.log("[Cart] Product added from wishlist:", title);
  };

  return (
    <tr className="hover:bg-gray-50">
      {/* Product - Image + Title */}
      <td className="py-4">
        <Link href={`/product/${slug}`} className="flex items-center gap-4">
          <img
            src={getProductImageUrl(image)}
            className="w-16 h-16 object-cover"
            alt={title}
          />
          <span className="text-sm font-medium hover:underline">{title}</span>
        </Link>
      </td>

      {/* Price */}
      <td className="py-4 text-sm hidden sm:table-cell">
        £{price}
      </td>

      {/* Status */}
      <td className="py-4 text-sm hidden sm:table-cell">
        {stockAvailability ? (
          <span className="text-green-600">In stock</span>
        ) : (
          <span className="text-red-600">Out of stock</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            className="text-xs uppercase tracking-wide px-3 py-2 border border-black hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddToCart}
            data-track-button="Wishlist:Add to Cart"
            disabled={!stockAvailability}
          >
            Add to Cart
          </button>
          <button
            className="p-2 text-gray-400 hover:text-gray-600"
            onClick={() => deleteItemFromWishlist(id)}
            data-track-button="Wishlist:Remove Item"
            disabled={!userId}
          >
            <FaXmark className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default WishItem;
