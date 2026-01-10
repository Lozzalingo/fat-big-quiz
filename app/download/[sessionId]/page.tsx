"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FaDownload, FaCheckCircle, FaSpinner, FaExclamationTriangle, FaArrowLeft, FaEnvelope, FaClock } from "react-icons/fa";

interface Purchase {
  id: string;
  email: string;
  downloadCount: number;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  product: {
    id: string;
    title: string;
    downloadFile: string | null;
    downloadLimit: number | null;
    productType: string;
  };
}

interface DownloadFile {
  downloadUrl: string;
  fileName: string;
  originalFileName: string;
}

interface DownloadInfo {
  downloadUrl: string;
  fileName: string;
  files: DownloadFile[];
  remainingDownloads: number | null;
}

export default function DownloadPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);

  // Add noindex meta tag to prevent search engines from indexing download pages
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    const fetchPurchase = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases/session/${sessionId}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError("Purchase not found. Please check your email for the download link or contact support.");
          } else if (response.status === 410) {
            setExpired(true);
          } else {
            setError("Error loading purchase details. Please try again later.");
          }
          return;
        }

        const data = await response.json();

        // Check if download link has expired
        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setExpired(true);
          setPurchase(data);
          return;
        }

        setPurchase(data);
      } catch (err) {
        console.error("Error fetching purchase:", err);
        setError("Error loading purchase details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchPurchase();
    }
  }, [sessionId]);

  // Prepare downloads - gets the file list but doesn't auto-download
  const handlePrepareDownloads = async () => {
    if (!purchase) return;

    setDownloading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases/${purchase.id}/download`,
        { method: "POST" }
      );

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403) {
          setError("Download limit exceeded. Please contact support for assistance.");
        } else if (response.status === 410) {
          setExpired(true);
        } else {
          setError(data.error || "Error initiating download");
        }
        return;
      }

      const data: DownloadInfo = await response.json();
      setDownloadInfo(data);

      // Update local state for download count
      setPurchase((prev) =>
        prev
          ? {
              ...prev,
              downloadCount: prev.downloadCount + 1,
            }
          : null
      );
    } catch (err) {
      console.error("Error downloading:", err);
      setError("Error initiating download. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadFile = (fileUrl: string) => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}${fileUrl}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-primary mx-auto mb-4" />
          <p className="text-text-secondary">Loading your purchase...</p>
        </div>
      </div>
    );
  }

  // Expired link - prompt to sign in
  if (expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaClock className="text-3xl text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Download Link Expired
          </h1>
          <p className="text-text-secondary mb-6">
            This download link has expired. To access your purchase, please sign in or create an account with the email address you used during checkout
            {purchase?.email && <span className="font-medium"> ({purchase.email})</span>}.
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-dark transition"
            >
              Sign In to Access Downloads
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full bg-background text-text-primary font-semibold py-3 px-6 rounded-lg hover:bg-border transition"
            >
              Create Account
            </Link>
          </div>
          <p className="text-xs text-text-secondary mt-4">
            Your purchases are linked to your email address and will appear in your account.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-3xl text-error" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Something Went Wrong
          </h1>
          <p className="text-text-secondary mb-6">{error}</p>
          <div className="space-y-3">
            <Link
              href="/shop"
              className="flex items-center justify-center gap-2 w-full bg-primary text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-dark transition"
            >
              <FaArrowLeft />
              Back to Shop
            </Link>
            <a
              href="mailto:support@fatbigquiz.com"
              className="flex items-center justify-center gap-2 w-full bg-background text-text-primary font-semibold py-3 px-6 rounded-lg hover:bg-border transition"
            >
              <FaEnvelope />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return null;
  }

  const remainingDownloads = purchase.product.downloadLimit
    ? purchase.product.downloadLimit - purchase.downloadCount
    : null;

  const canDownload =
    remainingDownloads === null || remainingDownloads > 0;

  // Calculate time remaining if there's an expiration
  const getTimeRemaining = () => {
    if (!purchase.expiresAt) return null;
    const expires = new Date(purchase.expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaCheckCircle className="text-5xl text-success" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Thank You for Your Purchase!
          </h1>
          <p className="text-text-secondary">
            Your order has been confirmed and your download is ready.
          </p>
        </div>

        {/* Expiration Warning */}
        {timeRemaining && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6 flex items-center gap-3">
            <FaClock className="text-warning text-xl flex-shrink-0" />
            <div>
              <p className="text-sm text-text-primary font-medium">
                This download link expires in {timeRemaining}
              </p>
              <p className="text-xs text-text-secondary">
                Create an account with {purchase.email} to access your downloads anytime.
              </p>
            </div>
          </div>
        )}

        {/* Download Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary to-primary-dark p-6 text-white">
            <h2 className="text-xl font-bold">{purchase.product.title}</h2>
            <p className="text-white/70 text-sm mt-1">
              Order confirmed on{" "}
              {new Date(purchase.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="p-6">
            {/* Download Info */}
            <div className="mb-6 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-text-secondary">
                <span>Confirmation sent to:</span>
                <span className="font-medium text-text-primary break-all">
                  {purchase.email}
                </span>
              </div>
              {purchase.product.downloadLimit && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-text-secondary">
                  <span>Downloads remaining:</span>
                  <span
                    className={`font-medium ${
                      remainingDownloads === 0
                        ? "text-error"
                        : "text-text-primary"
                    }`}
                  >
                    {remainingDownloads} of {purchase.product.downloadLimit}
                  </span>
                </div>
              )}
            </div>

            {/* Download Button(s) */}
            {canDownload ? (
              downloadInfo && downloadInfo.files && downloadInfo.files.length > 0 ? (
                // Show list of download buttons for each file
                <div className="space-y-3">
                  <p className="text-sm text-text-secondary mb-2">
                    Your purchase includes {downloadInfo.files.length} file{downloadInfo.files.length > 1 ? 's' : ''}:
                  </p>
                  {downloadInfo.files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => handleDownloadFile(file.downloadUrl)}
                      data-track-button="Download:Download File"
                      className="w-full bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold py-3 px-4 rounded-lg transition flex items-center gap-3"
                    >
                      <FaDownload />
                      <span className="truncate">{file.fileName}</span>
                    </button>
                  ))}
                </div>
              ) : (
                // Initial state - show button to prepare/reveal downloads
                <button
                  onClick={handlePrepareDownloads}
                  disabled={downloading}
                  data-track-button="Download:Show Files"
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-6 rounded-lg shadow-lg transform transition hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {downloading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Preparing Downloads...
                    </>
                  ) : (
                    <>
                      <FaDownload className="text-xl" />
                      Show Download Files
                    </>
                  )}
                </button>
              )
            ) : (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-center">
                <p className="text-error font-medium">
                  Download limit reached
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Please contact support if you need additional downloads.
                </p>
              </div>
            )}

            {/* Download Tips */}
            <div className="mt-6 p-4 bg-background rounded-lg">
              <h3 className="font-semibold text-text-primary mb-2">
                Download Tips
              </h3>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>
                  • Your download should start automatically
                </li>
                <li>
                  • Check your Downloads folder if it doesn't appear
                </li>
                <li>
                  • A confirmation email has been sent to {purchase.email}
                </li>
                <li>
                  • Bookmark this page to download again later
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-text-primary mb-4">What's Next?</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/shop"
              className="flex items-center gap-3 p-4 bg-background rounded-lg hover:bg-border transition"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FaDownload className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">More Quiz Packs</p>
                <p className="text-sm text-text-secondary">Browse our collection</p>
              </div>
            </Link>
            <Link
              href="/blog"
              className="flex items-center gap-3 p-4 bg-background rounded-lg hover:bg-border transition"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Free Questions</p>
                <p className="text-sm text-text-secondary">Check out our blog</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
