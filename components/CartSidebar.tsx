"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FaXmark, FaTrash } from "react-icons/fa6";
import { FaShoppingCart } from "react-icons/fa";
import { useProductStore } from "@/app/store/store";
import { getProductImageUrl } from "@/utils/cdn";

const CartSidebar = () => {
  const {
    products,
    total,
    allQuantity,
    sidebarOpen,
    closeSidebar,
    removeFromCart,
    calculateTotals,
  } = useProductStore();

  // Lock body scroll when sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    if (sidebarOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen, closeSidebar]);

  const handleRemove = (id: string) => {
    console.log("[CartSidebar] Removing item:", id);
    removeFromCart(id);
    calculateTotals();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-[9998] transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-[9999] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaShoppingCart className="text-gray-700" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
              Your Cart ({allQuantity})
            </h2>
          </div>
          <button
            onClick={closeSidebar}
            className="p-1 text-gray-400 hover:text-gray-700 transition-colours"
            aria-label="Close cart"
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FaShoppingCart className="text-4xl text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 mb-2">Your cart is empty</p>
              <button
                onClick={closeSidebar}
                className="text-xs text-primary underline underline-offset-2 hover:text-primary-dark"
              >
                Continue shopping
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {products.map((product) => (
                <li
                  key={product.id}
                  className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                >
                  {/* Product image */}
                  <div className="flex-shrink-0">
                    <img
                      src={getProductImageUrl(product.image)}
                      alt={product.title}
                      className="w-20 h-20 object-cover rounded"
                    />
                  </div>

                  {/* Product details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {product.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Qty: {product.amount}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      £{(product.price * product.amount).toFixed(2)}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(product.id)}
                    className="flex-shrink-0 p-1.5 text-gray-300 hover:text-red-500 transition-colours self-start"
                    aria-label={`Remove ${product.title}`}
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer with totals and CTA */}
        {products.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 space-y-4">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Subtotal</span>
              <span className="text-lg font-semibold text-gray-900">
                £{total.toFixed(2)}
              </span>
            </div>

            {/* Checkout button */}
            <Link
              href="/checkout"
              onClick={closeSidebar}
              data-track-button="CartSidebar:Checkout"
              className="block w-full bg-primary text-white text-center text-xs font-medium uppercase tracking-wide py-3.5 hover:bg-primary/90 transition-colours"
            >
              Checkout
            </Link>

            {/* View cart link */}
            <Link
              href="/cart"
              onClick={closeSidebar}
              data-track-button="CartSidebar:View Cart"
              className="block w-full text-center text-xs uppercase tracking-wide py-2 text-gray-600 hover:text-gray-900 hover:underline transition-colours"
            >
              View Cart
            </Link>
          </div>
        )}
      </div>
    </>
  );
};

export default CartSidebar;
