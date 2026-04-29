"use client";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("[Auth] Requesting password reset for:", email);
      const res = await fetch(`${API_BASE}/api/shared-auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();
      console.log("[Auth] Forgot password response:", data);

      setSubmitted(true);
      toast.success("If an account exists, a reset email has been sent");
    } catch (error) {
      console.error("[Auth] Forgot password error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">&#9993;</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-3">Check your email</h1>
          <p className="text-sm text-gray-600 mb-6">
            If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
            The link expires in 1 hour.
          </p>
          <Link href="/login" className="text-primary font-medium text-sm hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Forgot password?
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="block w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none transition"
          />

          <button
            type="submit"
            disabled={loading}
            data-action="forgot_password_submit"
            className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
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
