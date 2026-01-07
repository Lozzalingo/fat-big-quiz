"use client";
import { CustomButton, DashboardSidebar } from "@/components";
import toast from "react-hot-toast";
import Link from "next/link";
import React, { useEffect, useState } from "react";

interface DiscountCode {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  startDate?: string;
  endDate?: string;
  minPurchase?: number;
  maxRedemptions?: number;
  currentRedemptions: number;
  isActive: boolean;
}

const DashboardDiscountCodes = () => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [editedDiscountCodes, setEditedDiscountCodes] = useState<Record<string, Partial<DiscountCode>>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const handleInputChange = (id: string, field: keyof DiscountCode, value: any) => {
    setEditedDiscountCodes((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const fetchDiscountCodes = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discount-codes`);
      if (!res.ok) throw new Error("Failed to fetch discount codes");
      const data = await res.json();
      setDiscountCodes(data);
      const initialEdits = data.reduce((acc: any, curr: DiscountCode) => {
        acc[curr.id] = { ...curr };
        return acc;
      }, {});
      setEditedDiscountCodes(initialEdits);
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      toast.error("Failed to load discount codes");
    }
  };

  const updateDiscountCode = async (id: string) => {
    const edited = editedDiscountCodes[id];
    if (!edited.code || edited.code.trim().length === 0) {
      toast.error("Discount code cannot be empty");
      return;
    }

    try {
      const requestOptions = {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: edited.code,
          discountType: edited.discountType,
          discountValue: Number(edited.discountValue),
          startDate: edited.startDate || null,
          endDate: edited.endDate || null,
          minPurchase: edited.minPurchase ? Number(edited.minPurchase) : null,
          maxRedemptions: edited.maxRedemptions ? Number(edited.maxRedemptions) : null,
          isActive: edited.isActive,
        }),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discount-codes/${id}`, requestOptions);
      const responseData = await res.json();

  if (res.ok) {
    toast.success("Discount code updated successfully");
    setDiscountCodes((prev) =>
      prev.map((code: DiscountCode) => (code.id === id ? { ...code, ...edited } : code))
    );
  } else {
    toast.error(responseData.error || "Failed to update discount code");
  }
} catch (error) {
      console.error("Error updating discount code:", error);
      toast.error("Error updating discount code");
    }
  };

  const deleteDiscountCode = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discount-codes/${id}`, {
        method: "DELETE",
      });
      if (res.status === 204) {
        toast.success("Discount code deleted successfully");
        setDiscountCodes((prev) => prev.filter((code) => code.id !== id));
        setEditedDiscountCodes((prev) => {
          const { [id]: _, ...rest } = prev;
          return rest;
        });
      } else {
        throw new Error("Failed to delete discount code");
      }
    } catch (error) {
      console.error("Error deleting discount code:", error);
      toast.error("Error deleting discount code");
    }
  };

  useEffect(() => {
    fetchDiscountCodes();
  }, []);

  const filteredDiscountCodes = discountCodes.filter((code) =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <DashboardSidebar />
      <div className="flex-1 min-w-0 p-6 overflow-auto">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex justify-between items-center mb-6 max-xl:flex-col max-xl:gap-y-4 max-xl:items-start">
            <h1 className="text-2xl font-semibold">All Discount Codes</h1>
            <div className="flex gap-4 max-xl:flex-col max-xl:w-full">
              <input
                type="text"
                placeholder="Search discount codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered w-full max-w-xs"
              />
              <Link href="/admin/discount-codes/new">
                <CustomButton
                  buttonType="button"
                  customWidth="150px"
                  paddingX={10}
                  paddingY={5}
                  textSize="base"
                  text="Add new discount code"
                />
              </Link>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="table table-md table-pin-cols w-full">
            <thead>
              <tr>
                <th>Code</th>
                <th>Type</th>
                <th>Value</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Min Purchase</th>
                <th>Max Redemptions</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiscountCodes.map((code) => (
                <tr key={code.id}>
                  <td>
                    <input
                      type="text"
                      value={editedDiscountCodes[code.id]?.code || ""}
                      onChange={(e) => handleInputChange(code.id, "code", e.target.value)}
                      className="input input-bordered w-full max-w-xs"
                    />
                  </td>
                  <td>
                    <select
                      value={editedDiscountCodes[code.id]?.discountType || "PERCENTAGE"}
                      onChange={(e) =>
                        handleInputChange(code.id, "discountType", e.target.value as "PERCENTAGE" | "FIXED")
                      }
                      className="select select-bordered w-full max-w-xs"
                    >
                      <option value="PERCENTAGE">Percentage</option>
                      <option value="FIXED">Fixed</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editedDiscountCodes[code.id]?.discountValue || ""}
                      onChange={(e) => handleInputChange(code.id, "discountValue", e.target.value)}
                      className="input input-bordered w-full max-w-xs"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={editedDiscountCodes[code.id]?.startDate?.split("T")[0] || ""}
                      onChange={(e) => handleInputChange(code.id, "startDate", e.target.value)}
                      className="input input-bordered w-full max-w-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="date"
                      value={editedDiscountCodes[code.id]?.endDate?.split("T")[0] || ""}
                      onChange={(e) => handleInputChange(code.id, "endDate", e.target.value)}
                      className="input input-bordered w-full max-w-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editedDiscountCodes[code.id]?.minPurchase || ""}
                      onChange={(e) => handleInputChange(code.id, "minPurchase", e.target.value)}
                      className="input input-bordered w-full max-w-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={editedDiscountCodes[code.id]?.maxRedemptions || ""}
                      onChange={(e) => handleInputChange(code.id, "maxRedemptions", e.target.value)}
                      className="input input-bordered w-full max-w-xs"
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={editedDiscountCodes[code.id]?.isActive ?? true}
                      onChange={(e) => handleInputChange(code.id, "isActive", e.target.checked)}
                      className="checkbox"
                    />
                  </td>
                  <td className="flex gap-2">
                    <Link href={`/admin/discount-codes/${code.id}`}>
                      <button className="btn-edit btn btn-sm">Edit</button>
                    </Link>
                    <button
                      className="btn-save btn btn-sm"
                      onClick={() => updateDiscountCode(code.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn-delete btn btn-sm"
                      onClick={() => deleteDiscountCode(code.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardDiscountCodes;