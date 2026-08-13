"use client";
import { Breadcrumb, WishItem } from "@/components";
import React from "react";
import { useWishlistStore } from "../store/wishlistStore";
import { nanoid } from "nanoid";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useGetUserByEmail } from "@/hooks/useGetUserByEmail";
import { useWishlist } from "@/hooks/useWishlist";

const WishlistPage = () => {
  const { data: session } = useSession();
  const { wishlist } = useWishlistStore();
  const { user } = useGetUserByEmail(session?.user?.email || null);
  useWishlist(user?.id || null);

  return (
    <div className="text-black bg-white">
      <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5">
        <Breadcrumb />
        <h2 className="text-2xl font-bold max-sm:text-xl max-[400px]:text-lg uppercase">
          Wishlist
        </h2>
        <div className="divider"></div>

        {wishlist && wishlist.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 mb-4">Your wishlist is empty</p>
            <Link
              href="/shop"
              className="text-sm uppercase tracking-wide hover:underline"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Product</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-gray-500 hidden sm:table-cell">Price</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-gray-500 hidden sm:table-cell">Status</th>
                  <th className="pb-3 text-xs font-medium uppercase tracking-wide text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wishlist &&
                  wishlist?.map((item) => (
                    <WishItem
                      id={item?.id}
                      title={item?.title}
                      price={item?.price}
                      image={item?.image}
                      slug={item?.slug}
                      stockAvailability={item?.stockAvailability}
                      key={nanoid()}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
