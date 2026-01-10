"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FaDownload, FaSpinner } from "react-icons/fa";
import { getProductImageUrl } from "@/utils/cdn";
import { Breadcrumb } from "@/components";

interface Purchase {
  id: string;
  email: string;
  downloadCount: number;
  status: string;
  createdAt: string;
  stripeSessionId: string;
  product: {
    id: string;
    title: string;
    mainImage: string | null;
    downloadFile: string | null;
    productType: string;
  };
}

export default function PurchasesPage() {
  const { data: session, status } = useSession();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases/email/${encodeURIComponent(session.user.email)}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch purchases");
        }

        const data = await response.json();
        setPurchases(data);
      } catch (err) {
        console.error("Error fetching purchases:", err);
        setError("Failed to load purchase history");
      } finally {
        setLoading(false);
      }
    };

    if (status !== "loading") {
      fetchPurchases();
    }
  }, [session, status]);

  if (status === "loading" || loading) {
    return (
      <div className="text-black bg-white min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5 py-10">
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-2xl text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-black bg-white min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5">
          <Breadcrumb />
          <h2 className="text-2xl font-bold max-sm:text-xl uppercase mb-6">My Purchases</h2>
          <div className="divider"></div>
          <div className="py-10 text-center">
            <p className="text-gray-500 mb-6">
              You need to be logged in to view your purchase history.
            </p>
            <Link
              href="/login"
              className="inline-block bg-primary text-white text-sm font-medium uppercase tracking-wide px-6 py-3 hover:bg-primary-dark transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-black bg-white min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5">
          <Breadcrumb />
          <h2 className="text-2xl font-bold max-sm:text-xl uppercase mb-6">My Purchases</h2>
          <div className="divider"></div>
          <div className="py-10 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              data-track-button="Purchases:Retry"
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-black bg-white min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-10 max-sm:px-5">
        <Breadcrumb />
        <h2 className="text-2xl font-bold max-sm:text-xl uppercase">My Purchases</h2>
        <div className="divider"></div>

        {purchases.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-500 mb-6">
              You haven't purchased any quiz packs yet.
            </p>
            <Link
              href="/shop"
              className="inline-block bg-primary text-white text-sm font-medium uppercase tracking-wide px-6 py-3 hover:bg-primary-dark transition-colors"
            >
              Browse Quiz Packs
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex flex-col sm:flex-row py-6 gap-4"
              >
                {/* Product Image */}
                <div className="w-24 h-24 flex-shrink-0 bg-gray-50">
                  <img
                    src={getProductImageUrl(purchase.product.mainImage)}
                    alt={purchase.product.title}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-black">
                      {purchase.product.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Purchased on{" "}
                      {new Date(purchase.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {purchase.product.productType === "DIGITAL_DOWNLOAD" && (
                      <p className="text-xs text-gray-400 mt-1">
                        Downloaded {purchase.downloadCount} time{purchase.downloadCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Download Button */}
                  {purchase.product.productType === "DIGITAL_DOWNLOAD" && purchase.stripeSessionId && (
                    <Link
                      href={`/download/${purchase.stripeSessionId}`}
                      className="inline-flex items-center gap-2 bg-primary text-white text-xs font-medium uppercase tracking-wide px-4 py-2.5 hover:bg-primary-dark transition-colors"
                    >
                      <FaDownload />
                      Download
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
