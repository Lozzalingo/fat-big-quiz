"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { FaDownload, FaCalendar, FaTicketAlt, FaShoppingCart, FaHeart, FaHeartBroken } from "react-icons/fa";
import { useProductStore } from "@/app/store/store";
import { useWishlistStore } from "@/app/store/wishlistStore";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  title: string;
  price: number;
  description?: string;
  productType: string;
  mainImage?: string;
  slug?: string;
  inStock?: number;
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
  const [isInWishlist, setIsInWishlist] = useState(false);
  const router = useRouter();

  const { addToCart, calculateTotals, products: cartProducts } = useProductStore();
  const { addToWishlist, removeFromWishlist, wishlist } = useWishlistStore();

  // Check if product is in cart
  const isInCart = cartProducts.some(item => item.id === product.id);

  // Check if product is in wishlist
  useEffect(() => {
    const checkWishlist = async () => {
      if (session?.user?.email) {
        try {
          const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${session.user.email}`);
          const userData = await userRes.json();
          if (userData?.id) {
            const wishRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wishlist/${userData.id}/${product.id}`);
            const wishData = await wishRes.json();
            setIsInWishlist(wishData?.[0]?.id ? true : false);
          }
        } catch (e) {
          console.error("Error checking wishlist:", e);
        }
      }
    };
    checkWishlist();
  }, [session?.user?.email, product.id, wishlist]);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.mainImage || "",
      amount: 1,
    });
    calculateTotals();
    toast.success("Added to cart");
  };

  const handleAddToWishlist = async () => {
    if (!session?.user?.email) {
      toast.error("Please sign in to add to wishlist");
      return;
    }
    try {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${session.user.email}`);
      const userData = await userRes.json();

      if (isInWishlist) {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wishlist/${userData.id}/${product.id}`, {
          method: "DELETE",
        });
        removeFromWishlist(product.id);
        setIsInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wishlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, userId: userData.id }),
        });
        addToWishlist({
          id: product.id,
          title: product.title,
          price: product.price,
          image: product.mainImage || "",
          slug: productSlug,
          stockAvailabillity: product.inStock || 1,
        });
        setIsInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch (e) {
      toast.error("Failed to update wishlist");
    }
  };

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
      {/* Buy Now Button */}
      <button
        onClick={handleCheckout}
        disabled={isLoading}
        data-track-button="Product:Buy Now"
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

      {/* Add to Cart & Wishlist Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleAddToCart}
          data-track-button="Product:Add to Cart"
          className={`flex-1 border text-xs font-medium uppercase tracking-wide py-3 flex items-center justify-center gap-2 transition-all ${
            isInCart
              ? "border-green-500 text-green-600 bg-green-50"
              : "border-gray-300 text-gray-700 hover:border-primary hover:text-primary"
          }`}
        >
          <FaShoppingCart className="text-xs" />
          {isInCart ? "In Cart" : "Add to Cart"}
        </button>
        <button
          onClick={handleAddToWishlist}
          data-track-button="Product:Toggle Wishlist"
          className={`w-12 border text-xs font-medium flex items-center justify-center transition-all ${
            isInWishlist
              ? "border-red-400 text-red-500 bg-red-50"
              : "border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-500"
          }`}
          title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          {isInWishlist ? <FaHeartBroken /> : <FaHeart />}
        </button>
      </div>

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
