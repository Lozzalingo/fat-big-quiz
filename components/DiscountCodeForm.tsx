"use client";
import { CustomButton, DashboardSidebar } from "@/components";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

interface FormData {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  startDate: string;
  endDate: string;
  minPurchase: string;
  maxRedemptions: string;
  isActive: boolean;
}

interface DiscountCodeFormProps {
  initialData?: FormData; // Pre-populated data for editing
  onSubmit: (data: FormData) => Promise<void>; // Custom submit handler
  submitButtonText: string; // Text for submit button
  title: string; // Form title
}

const DiscountCodeForm: React.FC<DiscountCodeFormProps> = ({
  initialData = {
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    startDate: "",
    endDate: "",
    minPurchase: "",
    maxRedemptions: "",
    isActive: true,
  },
  onSubmit,
  submitButtonText,
  title,
}) => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.code.trim()) {
      newErrors.code = "Discount code is required";
    }
    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      newErrors.discountValue = "Discount value must be a positive number";
    }
    if (formData.startDate && formData.endDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      newErrors.endDate = "End date must be after start date";
    }
    if (formData.minPurchase && Number(formData.minPurchase) < 0) {
      newErrors.minPurchase = "Minimum purchase cannot be negative";
    }
    if (formData.maxRedemptions && Number(formData.maxRedemptions) <= 0) {
      newErrors.maxRedemptions = "Max redemptions must be positive";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error submitting discount code");
    }
  };

  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto h-full max-xl:flex-col max-xl:h-fit max-xl:gap-y-4">
      <DashboardSidebar />
      <div className="w-full p-6">
        <h1 className="text-3xl font-semibold text-center mb-6">{title}</h1>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
          <div>
            <label className="label">
              <span className="label-text">Code</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleChange("code", e.target.value)}
              className={`input input-bordered w-full ${errors.code ? "input-error" : ""}`}
              placeholder="e.g., SAVE10"
            />
            {errors.code && <p className="text-error text-sm mt-1">{errors.code}</p>}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Discount Type</span>
            </label>
            <select
              value={formData.discountType}
              onChange={(e) => handleChange("discountType", e.target.value)}
              className="select select-bordered w-full"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="label">
              <span className="label-text">Discount Value</span>
            </label>
            <input
              type="number"
              value={formData.discountValue}
              onChange={(e) => handleChange("discountValue", e.target.value)}
              className={`input input-bordered w-full ${errors.discountValue ? "input-error" : ""}`}
              step="0.01"
              placeholder="e.g., 10.00"
            />
            {errors.discountValue && <p className="text-error text-sm mt-1">{errors.discountValue}</p>}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Start Date (Optional)</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleChange("startDate", e.target.value)}
              className="input input-bordered w-full"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">End Date (Optional)</span>
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleChange("endDate", e.target.value)}
              className={`input input-bordered w-full ${errors.endDate ? "input-error" : ""}`}
            />
            {errors.endDate && <p className="text-error text-sm mt-1">{errors.endDate}</p>}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Minimum Purchase (Optional)</span>
            </label>
            <input
              type="number"
              value={formData.minPurchase}
              onChange={(e) => handleChange("minPurchase", e.target.value)}
              className={`input input-bordered w-full ${errors.minPurchase ? "input-error" : ""}`}
              placeholder="e.g., 50"
            />
            {errors.minPurchase && <p className="text-error text-sm mt-1">{errors.minPurchase}</p>}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Max Redemptions (Optional)</span>
            </label>
            <input
              type="number"
              value={formData.maxRedemptions}
              onChange={(e) => handleChange("maxRedemptions", e.target.value)}
              className={`input input-bordered w-full ${errors.maxRedemptions ? "input-error" : ""}`}
              placeholder="e.g., 100"
            />
            {errors.maxRedemptions && <p className="text-error text-sm mt-1">{errors.maxRedemptions}</p>}
          </div>

          <div>
            <label className="label cursor-pointer">
              <span className="label-text">Active</span>
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
                className="checkbox"
              />
            </label>
          </div>

          <div className="flex justify-end gap-4">
            <CustomButton
              buttonType="button"
              customWidth="120px"
              paddingX={10}
              paddingY={5}
              textSize="base"
              text="Cancel"
              onClick={() => router.push("/admin/discount-codes")}
            />
            <CustomButton
              buttonType="submit"
              customWidth="150px"
              paddingX={10}
              paddingY={5}
              textSize="base"
              text={submitButtonText}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiscountCodeForm;