"use client";
import { useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function PreferencesPage() {
  const [email, setEmail] = useState("");
  const [found, setFound] = useState(false);
  const [prefs, setPrefs] = useState({ news: true, products: true, offers: true });
  const [status, setStatus] = useState<"idle" | "loading" | "saved" | "not_found">("idle");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    try {
      const res = await fetch(`${API_BASE}/api/subscribers/${encodeURIComponent(email)}`);
      if (res.ok) {
        setFound(true);
        setStatus("idle");
      } else {
        setStatus("not_found");
      }
    } catch {
      setStatus("not_found");
    }
  };

  const handleSave = async () => {
    setStatus("loading");
    try {
      await fetch(`${API_BASE}/api/subscribers/${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: Object.values(prefs).some(Boolean) }),
      });
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  };

  const handleUnsubscribeAll = async () => {
    setStatus("loading");
    try {
      await fetch(`${API_BASE}/api/subscribers/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setPrefs({ news: false, products: false, offers: false });
      setStatus("saved");
    } catch {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">Email Preferences</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Manage what emails you receive from us.</p>

        {!found ? (
          <form onSubmit={handleLookup} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="block w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              data-action="preferences_lookup"
              className="w-full bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
            >
              {status === "loading" ? "Looking up..." : "Manage Preferences"}
            </button>
            {status === "not_found" && (
              <p className="text-sm text-red-500 text-center">Email not found in our subscriber list.</p>
            )}
          </form>
        ) : status === "saved" ? (
          <div className="text-center">
            <div className="text-3xl mb-3">&#10003;</div>
            <p className="text-sm text-gray-600 mb-4">Preferences saved!</p>
            <Link href="/" className="text-primary font-medium text-sm hover:underline">Go to homepage</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Subscribed as: <strong>{email}</strong></p>

            {[
              { key: "news", label: "News & Blog Updates", desc: "New quiz articles, tips, and blog posts" },
              { key: "products", label: "New Products", desc: "New quiz packs, game shows, and events" },
              { key: "offers", label: "Special Offers", desc: "Discounts, promotions, and exclusive deals" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={prefs[key as keyof typeof prefs]}
                  onChange={(e) => setPrefs(p => ({ ...p, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-primary rounded"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              </label>
            ))}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSave}
                data-action="preferences_save"
                className="flex-1 bg-primary text-white text-sm font-medium py-2.5 rounded-lg hover:bg-primary/90 transition"
              >
                Save Preferences
              </button>
              <button
                onClick={handleUnsubscribeAll}
                data-action="preferences_unsubscribe_all"
                className="px-4 py-2.5 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50 transition"
              >
                Unsubscribe All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
