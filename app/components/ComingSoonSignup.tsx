"use client";

import { useState, FormEvent } from "react";

interface ComingSoonSignupProps {
  source: string;
  title: string;
  description: string;
  emoji: string;
}

export default function ComingSoonSignup({
  source,
  title,
  description,
  emoji,
}: ComingSoonSignupProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    console.log(`[ComingSoon] Submitting signup: source=${source}, email=${email}`);

    try {
      const res = await fetch("https://app.fatbigquiz.com/api/beta-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, source }),
      });

      const data = await res.json();
      console.log(`[ComingSoon] Response:`, data);

      if (data.success) {
        setStatus("success");
        setMessage(data.message || "Thanks! We will be in touch soon.");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch (err) {
      console.error(`[ComingSoon] Failed:`, err);
      setStatus("error");
      setMessage("Could not connect. Please try again later.");
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-background">
      <div className="text-center px-4 max-w-lg w-full">
        <div className="text-6xl mb-6">{emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          {title}
        </h1>
        <p className="text-lg text-text-secondary mb-4 max-w-md mx-auto">
          {description}
        </p>
        <p className="text-primary font-semibold mb-8">Coming Soon!</p>

        {status === "success" ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-green-800">
            <div className="text-2xl mb-2">🎉</div>
            <p className="font-semibold">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <p className="text-sm text-text-secondary text-center mb-2">
              Be the first to know when we launch. Sign up below.
            </p>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-1">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
              />
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm text-center">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              data-action={`coming_soon_signup_${source}`}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Signing up..." : "Notify Me"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
