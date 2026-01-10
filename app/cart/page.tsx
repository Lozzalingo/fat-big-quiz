"use client";

import {
  Breadcrumb,
  QuantityInputCart,
} from "@/components";
import React from "react";
import { FaXmark } from "react-icons/fa6";
import { useProductStore } from "../store/store";
import Link from "next/link";
import toast from "react-hot-toast";
import { getProductImageUrl } from "@/utils/cdn";

const CartPage = () => {
  const { products, removeFromCart, calculateTotals, total } =
    useProductStore();

  const handleRemoveItem = (id: string) => {
    removeFromCart(id);
    calculateTotals();
    toast.success("Product removed from the cart");
  };

  const getImageSrc = (imageName: string | undefined) => {
    return getProductImageUrl(imageName);
  };

  return (
    <div className="text-black bg-white">
      <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5">
        <Breadcrumb />
        <h2 className="text-2xl font-bold max-sm:text-xl max-[400px]:text-lg uppercase">
          Cart
        </h2>
        <div className="divider"></div>

        {products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 mb-4">Your cart is empty</p>
            <Link
              href="/shop"
              className="text-sm uppercase tracking-wide hover:underline"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-8">
            {/* Cart Items */}
            <div className="lg:col-span-7">
              <ul className="divide-y divide-gray-200">
                {products.map((product) => (
                  <li key={product.id} className="flex py-6 gap-4 sm:gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={getImageSrc(product.image)}
                        alt={product.title}
                        className="w-24 h-24 sm:w-32 sm:h-32 object-cover"
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="text-sm font-medium">
                            <Link
                              href={`/product/${product.slug || product.id}`}
                              className="hover:underline"
                            >
                              {product.title}
                            </Link>
                          </h3>
                          <p className="mt-1 text-sm font-medium">
                            £{product.price}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(product.id)}
                          type="button"
                          data-track-button="Cart:Remove Item"
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <span className="sr-only">Remove</span>
                          <FaXmark className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <QuantityInputCart product={product} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-5 pb-8">
              <div className="border border-gray-200 p-6">
                <h3 className="text-sm font-medium uppercase tracking-wide mb-4">
                  Order Summary
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">£{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 mt-4 pt-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  data-track-button="Cart:Proceed to Checkout"
                  className="mt-6 block w-full bg-black text-white text-center text-xs font-medium uppercase tracking-wide py-3 hover:bg-gray-800 transition-colors"
                >
                  Checkout
                </Link>

                <Link
                  href="/shop"
                  className="mt-3 block w-full text-center text-xs uppercase tracking-wide py-2 hover:underline"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
