"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/utils/api";

const API_BASE = getApiBaseUrl();

export default function ConfirmSubscriptionPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid confirmation link.");
      return;
    }

    fetch(`${API_BASE}/api/subscribers/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
        } else {
          setStatus("success");
          setMessage(data.message || "Subscription confirmed!");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm text-center">
        {status === "loading" && <p className="text-gray-500">Confirming...</p>}
        {status === "success" && (
          <>
            <div className="text-4xl mb-4">&#10003;</div>
            <h1 className="text-xl font-semibold text-gray-900 mb-3">You&apos;re in!</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link href="/" className="text-primary font-medium text-sm hover:underline">
              Go to homepage
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-3">Oops</h1>
            <p className="text-sm text-gray-600 mb-6">{message}</p>
            <Link href="/" className="text-primary font-medium text-sm hover:underline">
              Go to homepage
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
