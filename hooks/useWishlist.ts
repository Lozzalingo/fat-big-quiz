"use client";

import { useState, useEffect, useCallback } from "react";
import { useWishlistStore } from "@/app/store/wishlistStore";
import { getApiBaseUrl } from "@/utils/api";

interface WishlistProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailability: number;
}

interface UseWishlistResult {
  wishlistItems: WishlistProduct[];
  wishlistCount: number;
  loading: boolean;
  refetch: () => void;
}

export function useWishlist(userId: string | null | undefined): UseWishlistResult {
  const { setWishlist } = useWishlistStore();
  const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!userId) {
      return;
    }

    let cancelled = false;

    const fetchWishlist = async () => {
      setLoading(true);
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/wishlist/${userId}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch wishlist: ${response.status}`);
        }
        const data = await response.json();

        const productArray: WishlistProduct[] = data.map((item: any) => ({
          id: item?.product?.id,
          title: item?.product?.title,
          price: item?.product?.price,
          image: item?.product?.mainImage,
          slug: item?.product?.slug,
          stockAvailability: item?.product?.inStock,
        }));

        if (!cancelled) {
          setWishlistItems(productArray);
          setWishlist(productArray);
        }
      } catch (err) {
        console.error("[Wishlist] Failed to fetch wishlist by user ID:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchWishlist();

    return () => {
      cancelled = true;
    };
  }, [userId, refetchTrigger, setWishlist]);

  return { wishlistItems, wishlistCount: wishlistItems.length, loading, refetch };
}
