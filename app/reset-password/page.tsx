"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Invalid link</h1>
          <p className="text-sm text-gray-600 mb-6">
            This password reset link is missing or invalid. Please request a new one.
          </p>
          <Link href="/forgot-password" className="text-primary font-medium text-sm hover:underline">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">&#10003;</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Password reset</h1>
          <p className="text-sm text-gray-600 mb-6">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Link href="/login" className="text-primary font-medium text-sm hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      console.log("[Auth] Submitting password reset");
      const res = await fetch(`${API_BASE}/api/shared-auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      console.log("[Auth] Reset password response:", data);

      if (res.ok) {
        setSuccess(true);
        toast.success("Password reset successfully");
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("[Auth] Reset password error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Reset password
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your new password below.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            required
            minLength={8}
            className="block w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition"
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            minLength={8}
            className="block w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition"
          />

          <button
            type="submit"
            disabled={loading}
            data-action="reset_password_submit"
            className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="text-primary font-medium hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
