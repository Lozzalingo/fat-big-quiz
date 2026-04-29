"use client";
import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      await fetch(`${API_BASE}/api/subscribers/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Don't reveal errors
    }

    setStatus("done");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm text-center">
        {status === "done" ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-3">Unsubscribed</h1>
            <p className="text-sm text-gray-600 mb-6">
              If you were subscribed, you have been removed from our mailing list.
            </p>
            <Link href="/" className="text-primary font-medium text-sm hover:underline">
              Go to homepage
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Unsubscribe</h1>
            <p className="text-sm text-gray-500 mb-6">Enter your email to unsubscribe from our mailing list.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="block w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-1 focus:ring-primary focus:border-primary outline-none"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                data-action="unsubscribe_submit"
                className="w-full bg-gray-800 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
              >
                {status === "loading" ? "Processing..." : "Unsubscribe"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
