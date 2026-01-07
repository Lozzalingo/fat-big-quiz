"use client";

import { useWishlistStore } from "@/app/store/wishlistStore";
import { useProductStore } from "@/app/store/store";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaXmark } from "react-icons/fa6";
import { useSession } from "next-auth/react";
import { getProductImageUrl } from "@/utils/cdn";
import Link from "next/link";

interface ProductInWishlist {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailabillity: boolean;
}

const WishItem = ({
  id,
  title,
  price,
  image,
  slug,
  stockAvailabillity,
}: ProductInWishlist) => {
  const { data: session } = useSession();
  const { removeFromWishlist } = useWishlistStore();
  const { addToCart, calculateTotals } = useProductStore();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);

  const getUserByEmail = async () => {
    if (!session?.user?.email) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${session.user.email}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      setUserId(data?.id);
    } catch (error) {
      toast.error("Failed to fetch user data");
    }
  };

  const deleteItemFromWishlist = async (productId: string) => {
    if (userId) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wishlist/${userId}/${productId}`, {
        method: "DELETE",
      }).then(() => {
        removeFromWishlist(productId);
        toast.success("Removed from wishlist");
      });
    } else {
      toast.error("You need to be logged in");
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
    toast.success("Added to cart");
    router.push("/cart");
  };

  useEffect(() => {
    getUserByEmail();
  }, [session?.user?.email]);

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
        {stockAvailabillity ? (
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
            disabled={!stockAvailabillity}
          >
            Add to Cart
          </button>
          <button
            className="p-2 text-gray-400 hover:text-gray-600"
            onClick={() => deleteItemFromWishlist(id)}
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
