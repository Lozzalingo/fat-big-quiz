"use client";
import { Breadcrumb, WishItem } from "@/components";
import React, { useEffect } from "react";
import { useWishlistStore } from "../store/wishlistStore";
import { nanoid } from "nanoid";
import { useSession } from "next-auth/react";
import Link from "next/link";

const WishlistPage = () => {
  const { data: session } = useSession();
  const { wishlist, setWishlist } = useWishlistStore();

  const getWishlistByUserId = async (id: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/wishlist/${id}`, {
      cache: "no-store",
    });
    const wishlist = await response.json();

    const productArray: {
      id: string;
      title: string;
      price: number;
      image: string;
      slug: string;
      stockAvailabillity: number;
    }[] = [];

    wishlist.map((item: any) =>
      productArray.push({
        id: item?.product?.id,
        title: item?.product?.title,
        price: item?.product?.price,
        image: item?.product?.mainImage,
        slug: item?.product?.slug,
        stockAvailabillity: item?.product?.inStock,
      })
    );

    setWishlist(productArray);
  };

  const getUserByEmail = async () => {
    if (session?.user?.email) {
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/users/email/${session?.user?.email}`, {
        cache: "no-store",
      })
        .then((response) => response.json())
        .then((data) => {
          getWishlistByUserId(data?.id);
        });
    }
  };

  useEffect(() => {
    getUserByEmail();
  }, [session?.user?.email, wishlist.length]);

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
                      stockAvailabillity={item?.stockAvailabillity}
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
