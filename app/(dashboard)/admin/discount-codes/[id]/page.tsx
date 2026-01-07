"use client";
import DiscountCodeForm from "@/components/DiscountCodeForm";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface DiscountCode {
  id: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  startDate?: string;
  endDate?: string;
  minPurchase?: number;
  maxRedemptions?: number;
  isActive: boolean;
}

interface Props {
  params: { id: string };
}

const EditDiscountCode = ({ params }: Props) => {
  const router = useRouter();
  const [initialData, setInitialData] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDiscountCode = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discount-codes/${params.id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch discount code");
        }
        const data: DiscountCode = await res.json();
        setInitialData({
          ...data,
          discountValue: data.discountValue,
          startDate: data.startDate ? data.startDate.split("T")[0] : "",
          endDate: data.endDate ? data.endDate.split("T")[0] : "",
          minPurchase: data.minPurchase || undefined,
          maxRedemptions: data.maxRedemptions || undefined,
        });
      } catch (error) {
        console.error("Error fetching discount code:", error);
        toast.error("Failed to load discount code");
        router.push("/admin/discount-codes");
      } finally {
        setLoading(false);
      }
    };
    fetchDiscountCode();
  }, [params.id, router]);

  const handleSubmit = async (formData: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discount-codes/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: formData.code.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        minPurchase: formData.minPurchase ? Number(formData.minPurchase) : null,
        maxRedemptions: formData.maxRedemptions ? Number(formData.maxRedemptions) : null,
        isActive: formData.isActive,
      }),
    });

    if (res.ok) {
      toast.success("Discount code updated successfully");
      router.push("/admin/discount-codes");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update discount code");
    }
  };

  if (loading) {
    return <div className="text-center p-6">Loading...</div>;
  }

  if (!initialData) {
    return <div className="text-center p-6">Discount code not found</div>;
  }

  return (
    <DiscountCodeForm
      initialData={{
        ...initialData,
        discountValue: initialData.discountValue.toString(),
        startDate: initialData.startDate || "",
        endDate: initialData.endDate || "",
        minPurchase: initialData.minPurchase !== undefined ? initialData.minPurchase.toString() : "",
        maxRedemptions: initialData.maxRedemptions !== undefined ? initialData.maxRedemptions.toString() : "",
      }}
      onSubmit={handleSubmit}
      submitButtonText="Update Discount Code"
      title="Edit Discount Code"
    />
  );
};

export default EditDiscountCode;