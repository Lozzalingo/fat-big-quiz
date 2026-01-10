"use client";
import { DashboardSidebar } from "@/components";
import toast from "react-hot-toast";
import React, { useEffect, useState } from "react";
import {
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaExternalLinkAlt,
  FaGoogle,
  FaTrash,
  FaGlobe,
  FaExclamationTriangle,
  FaInfoCircle,
  FaClock,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

interface MerchantStatus {
  configured: boolean;
  merchantId: string | null;
  connected: boolean;
  error?: string;
  message?: string;
}

interface SyncResult {
  message: string;
  totalProducts: number;
  synced: number;
  failed: number;
  errors: Array<{ productId: string; errors: any[] }>;
}

interface DeleteResult {
  message: string;
  method?: string;
  deleted: number;
  failed: number;
  errors: Array<{ product: string; error: string }>;
}

interface DataSourceDeleteResult {
  message: string;
  deleted: Array<{ name: string; displayName: string }>;
  errors: Array<{ name: string; error: string }>;
}

interface ProductStatus {
  destinationStatuses?: Array<{
    approvedCountries: string[];
    pendingCountries: string[];
    disapprovedCountries: string[];
    reportingContext: string;
  }>;
  itemLevelIssues?: Array<{
    code: string;
    severity: string;
    description: string;
    detail: string;
    applicableCountries: string[];
  }>;
}

interface MerchantProduct {
  name: string;
  offerId: string;
  channel: string;
  contentLanguage: string;
  feedLabel: string;
  attributes: {
    title: string;
    link: string;
    imageLink: string;
    price?: { amountMicros: string; currencyCode: string };
    availability: string;
  };
  productStatus?: ProductStatus;
}

// Target markets for reference
const TARGET_MARKETS = [
  { region: "English-Speaking", countries: ["GB", "US", "CA", "AU", "NZ", "IE", "ZA", "SG", "HK", "PH", "MY", "IN"] },
  { region: "Europe (Euro)", countries: ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "FI", "GR", "SK", "SI", "EE", "LV", "LT", "LU", "MT", "CY", "HR"] },
  { region: "Europe (Non-Euro)", countries: ["SE", "DK", "NO", "PL", "CZ", "HU", "RO", "BG", "CH"] },
  { region: "Americas", countries: ["MX", "BR", "AR", "CL", "CO", "PE"] },
  { region: "Asia Pacific", countries: ["JP", "TW", "TH", "VN", "ID"] },
  { region: "Middle East & Other", countries: ["AE", "SA", "IL", "TR", "RU", "UA"] },
  { region: "Local Currency", countries: ["KR (South Korea - KRW)"] },
];

export default function GoogleMerchantPage() {
  const [status, setStatus] = useState<MerchantStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingDataSources, setIsDeletingDataSources] = useState(false);
  const [products, setProducts] = useState<MerchantProduct[]>([]);
  const [showProducts, setShowProducts] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [lastDelete, setLastDelete] = useState<DeleteResult | null>(null);
  const [showTargetMarkets, setShowTargetMarkets] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDataSourceDeleteConfirm, setShowDataSourceDeleteConfirm] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/status`);
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error fetching merchant status:", error);
      setStatus({ configured: false, merchantId: null, connected: false, error: "Failed to check status" });
    } finally {
      setIsLoading(false);
    }
  };

  const syncAllProducts = async () => {
    setIsSyncing(true);
    setLastSync(null);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/sync`, {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        setLastSync(data);
        toast.success(`Synced ${data.synced} products to Google Merchant Center`);
        if (data.failed > 0) {
          toast.error(`${data.failed} products failed to sync`);
        }
        // Refresh product list if showing
        if (showProducts) {
          fetchMerchantProducts();
        }
      } else {
        toast.error(data.error || "Failed to sync products");
      }
    } catch (error) {
      console.error("Error syncing products:", error);
      toast.error("Failed to sync products");
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteAllProducts = async () => {
    setIsDeleting(true);
    setLastDelete(null);
    setShowDeleteConfirm(false);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/all-products`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (response.ok) {
        setLastDelete(data);
        toast.success(`Deleted ${data.deleted} products from Merchant Center`);
        if (data.failed > 0) {
          toast.error(`${data.failed} products failed to delete`);
        }
        // Refresh product list
        if (showProducts) {
          fetchMerchantProducts();
        }
      } else {
        toast.error(data.error || "Failed to delete products");
      }
    } catch (error) {
      console.error("Error deleting products:", error);
      toast.error("Failed to delete products");
    } finally {
      setIsDeleting(false);
    }
  };

  const deleteDataSources = async () => {
    setIsDeletingDataSources(true);
    setShowDataSourceDeleteConfirm(false);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/data-sources`, {
        method: "DELETE",
      });
      const data: DataSourceDeleteResult = await response.json();

      if (response.ok) {
        toast.success(`Deleted ${data.deleted.length} data sources`);
        // Refresh status and products
        fetchStatus();
        setProducts([]);
        setShowProducts(false);
      } else {
        toast.error((data as any).error || "Failed to delete data sources");
      }
    } catch (error) {
      console.error("Error deleting data sources:", error);
      toast.error("Failed to delete data sources");
    } finally {
      setIsDeletingDataSources(false);
    }
  };

  const deleteSingleProduct = async (productId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/product/${productId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (response.ok) {
        toast.success(`Removed ${productId} from Merchant Center`);
        // Refresh product list
        fetchMerchantProducts();
      } else {
        toast.error(data.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error("Failed to delete product");
    }
  };

  const fetchMerchantProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/products`);
      const data = await response.json();
      if (response.ok) {
        setProducts(data.products || []);
        setShowProducts(true);
      } else {
        toast.error(data.error || "Failed to fetch products");
      }
    } catch (error) {
      toast.error("Failed to fetch products from Merchant Center");
    } finally {
      setLoadingProducts(false);
    }
  };

  const previewFeed = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/merchant/feed`);
      const data = await response.json();
      console.log("Feed preview:", data);
      toast.success(`Feed contains ${data.count} products. Check console for details.`);
    } catch (error) {
      toast.error("Failed to generate feed preview");
    }
  };

  const formatPrice = (amountMicros: string, currency: string) => {
    const amount = parseInt(amountMicros) / 1000000;
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
  };

  const getStatusBadge = (product: MerchantProduct) => {
    const status = product.productStatus;
    if (!status?.destinationStatuses?.length) {
      return <span className="badge badge-ghost badge-sm">Unknown</span>;
    }

    const dest = status.destinationStatuses[0];
    if (dest.approvedCountries?.length > 0) {
      return (
        <span className="badge badge-success badge-sm gap-1">
          <FaCheckCircle className="w-3 h-3" />
          Approved ({dest.approvedCountries.length})
        </span>
      );
    }
    if (dest.pendingCountries?.length > 0) {
      return (
        <span className="badge badge-warning badge-sm gap-1">
          <FaClock className="w-3 h-3" />
          Pending ({dest.pendingCountries.length})
        </span>
      );
    }
    if (dest.disapprovedCountries?.length > 0) {
      return (
        <span className="badge badge-error badge-sm gap-1">
          <FaTimesCircle className="w-3 h-3" />
          Disapproved ({dest.disapprovedCountries.length})
        </span>
      );
    }
    return <span className="badge badge-ghost badge-sm">No Status</span>;
  };

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-lg border p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FaGoogle className="text-blue-600 text-2xl" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold">Google Merchant Center</h1>
                  <p className="text-gray-500 text-sm mt-1">
                    Manage products in Google Shopping across 57+ countries
                  </p>
                </div>
              </div>
              {status?.configured && (
                <a
                  href={`https://merchants.google.com/mc/products/list?a=${status.merchantId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline gap-2"
                >
                  <FaExternalLinkAlt /> Open Merchant Center
                </a>
              )}
            </div>

            {/* Status Card */}
            {isLoading ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : (
              <>
                {/* Connection Status */}
                <div
                  className={`p-4 rounded-lg border-2 ${
                    status?.connected
                      ? "bg-green-50 border-green-200"
                      : status?.configured
                        ? "bg-yellow-50 border-yellow-200"
                        : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {status?.connected ? (
                      <FaCheckCircle className="text-green-600 text-2xl" />
                    ) : (
                      <FaTimesCircle className="text-gray-400 text-2xl" />
                    )}
                    <div>
                      <h3 className="font-medium">
                        {status?.connected
                          ? "Connected to Google Merchant Center"
                          : status?.configured
                            ? "Configuration Error"
                            : "Not Configured"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {status?.connected
                          ? `Merchant ID: ${status.merchantId}`
                          : status?.error || "Set up environment variables to connect"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Setup Instructions (if not configured) */}
                {!status?.configured && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">Setup Required</h3>
                    <p className="text-sm text-blue-800 mb-3">Add these environment variables to your server:</p>
                    <pre className="bg-blue-100 p-3 rounded text-xs overflow-x-auto">
                      {`GOOGLE_MERCHANT_ID=5708205694
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions Card */}
          {status?.connected && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                <button onClick={syncAllProducts} disabled={isSyncing} className="btn btn-primary gap-2">
                  {isSyncing ? <span className="loading loading-spinner loading-sm"></span> : <FaSync />}
                  {isSyncing ? "Syncing..." : "Sync All Products"}
                </button>

                <button
                  onClick={fetchMerchantProducts}
                  disabled={loadingProducts}
                  className="btn btn-outline gap-2"
                >
                  {loadingProducts ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <FaGlobe />
                  )}
                  {loadingProducts ? "Loading..." : `View Products (${products.length})`}
                </button>

                <button onClick={previewFeed} className="btn btn-ghost gap-2">
                  <FaInfoCircle />
                  Preview Feed (Console)
                </button>

                <div className="divider divider-horizontal"></div>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="btn btn-error btn-outline gap-2"
                >
                  {isDeleting ? <span className="loading loading-spinner loading-sm"></span> : <FaTrash />}
                  Delete All Products
                </button>

                <button
                  onClick={() => setShowDataSourceDeleteConfirm(true)}
                  disabled={isDeletingDataSources}
                  className="btn btn-error gap-2"
                >
                  {isDeletingDataSources ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <FaExclamationTriangle />
                  )}
                  Delete Data Sources
                </button>
              </div>

              {/* Delete Confirmation Modal */}
              {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Delete All Products?</h3>
                    <p className="text-gray-600 mb-4">
                      This will remove all {products.length || "?"} products from Google Merchant Center. They can be
                      re-synced later.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-ghost">
                        Cancel
                      </button>
                      <button onClick={deleteAllProducts} className="btn btn-error">
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Data Source Delete Confirmation Modal */}
              {showDataSourceDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 className="text-lg font-semibold text-red-600 mb-2 flex items-center gap-2">
                      <FaExclamationTriangle /> Delete Data Sources?
                    </h3>
                    <p className="text-gray-600 mb-2">
                      <strong>This is a nuclear option!</strong> It will delete:
                    </p>
                    <ul className="list-disc ml-5 text-gray-600 mb-4">
                      <li>All data sources (Primary + South Korea)</li>
                      <li>All products in those data sources</li>
                      <li>Data sources will be recreated on next sync</li>
                    </ul>
                    <p className="text-sm text-gray-500 mb-4">
                      Use this if products are stuck and normal deletion doesn't work.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowDataSourceDeleteConfirm(false)} className="btn btn-ghost">
                        Cancel
                      </button>
                      <button onClick={deleteDataSources} className="btn btn-error">
                        Delete Data Sources
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Sync Result */}
          {lastSync && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Last Sync Result</h2>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-3xl font-bold">{lastSync.totalProducts}</div>
                  <div className="text-sm text-gray-500">Total Products</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600">{lastSync.synced}</div>
                  <div className="text-sm text-gray-500">Synced</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-600">{lastSync.failed}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>

              {lastSync.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-red-600 mb-2">Errors:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {lastSync.errors.map((err, i) => (
                      <div key={i} className="text-xs bg-red-50 p-2 rounded">
                        <span className="font-medium">{err.productId}:</span>{" "}
                        {err.errors.map((e: any) => e.message || e.reason).join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Delete Result */}
          {lastDelete && (
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Last Delete Result</h2>
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Method</div>
                  <div className="font-semibold">{lastDelete.method || "REST"}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600">{lastDelete.deleted}</div>
                  <div className="text-sm text-gray-500">Deleted</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-600">{lastDelete.failed}</div>
                  <div className="text-sm text-gray-500">Failed</div>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          {showProducts && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  Products in Merchant Center ({products.length})
                </h2>
                <button onClick={() => setShowProducts(false)} className="btn btn-sm btn-ghost">
                  Hide
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <FaGlobe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No products in Merchant Center</p>
                  <p className="text-sm">Click "Sync All Products" to upload products</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Product</th>
                        <th>Feed</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.name} className="hover">
                          <td>
                            {product.attributes?.imageLink && (
                              <img
                                src={product.attributes.imageLink}
                                alt={product.attributes.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                          </td>
                          <td>
                            <div className="font-medium truncate max-w-xs">{product.attributes?.title}</div>
                            <div className="text-xs text-gray-500">{product.offerId}</div>
                          </td>
                          <td>
                            <span
                              className={`badge badge-sm ${
                                product.feedLabel === "KR" ? "badge-secondary" : "badge-primary"
                              }`}
                            >
                              {product.feedLabel}
                            </span>
                          </td>
                          <td>
                            {product.attributes?.price
                              ? formatPrice(
                                  product.attributes.price.amountMicros,
                                  product.attributes.price.currencyCode
                                )
                              : "-"}
                          </td>
                          <td>{getStatusBadge(product)}</td>
                          <td>
                            <div className="flex gap-1">
                              <a
                                href={product.attributes?.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-xs btn-ghost"
                                title="View on site"
                              >
                                <FaExternalLinkAlt />
                              </a>
                              <button
                                onClick={() => deleteSingleProduct(product.offerId)}
                                className="btn btn-xs btn-ghost text-red-500"
                                title="Remove from Merchant Center"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Target Markets Info */}
          <div className="bg-white rounded-lg border p-6">
            <button
              onClick={() => setShowTargetMarkets(!showTargetMarkets)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <FaGlobe className="text-blue-500" />
                <div className="text-left">
                  <h2 className="text-lg font-semibold">Target Markets</h2>
                  <p className="text-sm text-gray-500">57 countries + South Korea (KRW)</p>
                </div>
              </div>
              {showTargetMarkets ? <FaChevronUp /> : <FaChevronDown />}
            </button>

            {showTargetMarkets && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TARGET_MARKETS.map((region) => (
                  <div key={region.region} className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-sm mb-2">{region.region}</h3>
                    <div className="flex flex-wrap gap-1">
                      {region.countries.map((country) => (
                        <span
                          key={country}
                          className={`badge badge-sm ${
                            country.includes("KR") ? "badge-secondary" : "badge-ghost"
                          }`}
                        >
                          {country}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Card */}
          {status?.connected && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <FaInfoCircle /> How This Works
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  <strong>Auto-Sync:</strong> Products are automatically synced when created/updated in the admin panel
                </li>
                <li>
                  <strong>Two Data Sources:</strong> Primary (57 countries, GBP) + South Korea (KRW)
                </li>
                <li>
                  <strong>Currency Conversion:</strong> Google auto-converts GBP to local currencies for display
                </li>
                <li>
                  <strong>KR Products:</strong> Each product has a "-KR" variant with native KRW pricing (~1700x GBP)
                </li>
                <li>
                  <strong>Review Time:</strong> New products take up to 3 business days for Google to approve
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
