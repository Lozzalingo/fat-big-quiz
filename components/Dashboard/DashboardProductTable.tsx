"use client";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import CustomButton from "@/components/CustomButton";
import { getProductImageUrl } from "@/utils/cdn";
import { FaTrash, FaCopy, FaGripVertical } from "react-icons/fa";
import toast from "react-hot-toast";

interface Product {
  id: string;
  title: string;
  mainImage?: string;
  manufacturer?: string;
  inStock: boolean;
  price: number;
  displayOrder?: number;
}

const DashboardProductTable = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const getImageSrc = (imageName: string | undefined) => {
    return getProductImageUrl(imageName);
  };

  const fetchProducts = () => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products?mode=admin`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setProducts(data));
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${id}`, {
          method: "DELETE",
        })
      );

      await Promise.all(deletePromises);
      setSelectedIds(new Set());
      fetchProducts();
    } catch (error) {
      console.error("Error deleting products:", error);
      alert("Failed to delete some products. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${id}/duplicate`,
        { method: "POST" }
      );

      if (response.ok) {
        fetchProducts();
      } else {
        alert("Failed to duplicate product");
      }
    } catch (error) {
      console.error("Error duplicating product:", error);
      alert("Failed to duplicate product");
    } finally {
      setDuplicatingId(null);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // Reorder locally
    const newProducts = [...products];
    const [draggedProduct] = newProducts.splice(draggedIndex, 1);
    newProducts.splice(dropIndex, 0, draggedProduct);
    setProducts(newProducts);
    setDraggedIndex(null);

    // Save to server
    setIsReordering(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/reorder`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: newProducts.map((p) => p.id) }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save order");
      }

      toast.success("Order saved");
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Failed to save order");
      fetchProducts(); // Revert on error
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const isAllSelected = products.length > 0 && selectedIds.size === products.length;
  const isSomeSelected = selectedIds.size > 0;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">All Products</h1>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {products.length} total
          </span>
          {isReordering && (
            <span className="loading loading-spinner loading-sm text-primary"></span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isSomeSelected && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              data-track-button="Admin:Delete Products"
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <FaTrash className="text-xs" />
              {isDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
            </button>
          )}
          <Link href="/admin/products/new">
            <CustomButton
              buttonType="button"
              customWidth="110px"
              paddingX={10}
              paddingY={5}
              textSize="base"
              text="Add new product"
            />
          </Link>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="table table-md table-pin-cols w-full">
          {/* head */}
          <thead>
            <tr>
              <th className="w-8"></th>
              <th>
                <label>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                  />
                </label>
              </th>
              <th>Product</th>
              <th>Stock Availability</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products &&
              products.map((product, index) => (
                <tr
                  key={product.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`${selectedIds.has(product.id) ? "bg-primary/5" : ""} ${
                    draggedIndex === index ? "opacity-50 bg-blue-50" : ""
                  } cursor-move`}
                >
                  <td className="w-8 px-2">
                    <FaGripVertical className="text-gray-400 cursor-grab active:cursor-grabbing" />
                  </td>
                  <th>
                    <label>
                      <input
                        type="checkbox"
                        className="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </label>
                  </th>

                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="mask mask-squircle w-12 h-12">
                          <img
                            src={getImageSrc(product.mainImage)}
                            alt={product?.title || "Product image"}
                            style={{ width: "48px", height: "48px", objectFit: "cover" }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="font-bold">{product?.title}</div>
                        <div className="text-sm opacity-50">
                          {product?.manufacturer}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    {product?.inStock ? (
                      <span className="badge badge-success text-white badge-sm">
                        In stock
                      </span>
                    ) : (
                      <span className="badge badge-error text-white badge-sm">
                        Out of stock
                      </span>
                    )}
                  </td>
                  <td>£{product?.price}</td>
                  <th>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicate(product.id)}
                        disabled={duplicatingId === product.id}
                        data-track-button="Admin:Duplicate Product"
                        className="btn btn-ghost btn-xs"
                        title="Duplicate"
                      >
                        {duplicatingId === product.id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <FaCopy className="text-gray-500" />
                        )}
                      </button>
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="btn btn-ghost btn-xs"
                      >
                        details
                      </Link>
                    </div>
                  </th>
                </tr>
              ))}
          </tbody>
          {/* foot */}
          <tfoot>
            <tr>
              <th></th>
              <th></th>
              <th>Product</th>
              <th>Stock Availability</th>
              <th>Price</th>
              <th></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DashboardProductTable;