"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Legacy checkout page - redirect to cart (checkout now goes via Stripe)
const CheckoutPage = () => {
  const router = useRouter();

  useEffect(() => {
    console.log("[Checkout] Legacy checkout page hit, redirecting to /cart");
    router.replace("/cart");
  }, [router]);

  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-500">Redirecting to cart...</p>
    </div>
  );
};

export default CheckoutPage;
