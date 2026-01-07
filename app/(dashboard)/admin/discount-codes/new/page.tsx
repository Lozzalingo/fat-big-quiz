"use client";
import DiscountCodeForm from "@/components/DiscountCodeForm";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const NewDiscountCode = () => {
  const router = useRouter();

  const handleSubmit = async (formData: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discount-codes`, {
      method: "POST",
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
      toast.success("Discount code created successfully");
      router.push("/admin/discount-codes");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to create discount code");
    }
  };

  return (
    <DiscountCodeForm
      onSubmit={handleSubmit}
      submitButtonText="Create Discount Code"
      title="Create New Discount Code"
    />
  );
};

export default NewDiscountCode;