"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    // Validate
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!marketingOptIn) newErrors.marketingOptIn = "This is required";
    if (!termsAccepted) newErrors.termsAccepted = "You must agree to the terms";
    if (!privacyAccepted) newErrors.privacyAccepted = "You must agree to the privacy policy";

    if (Object.keys(newErrors).length > 0) {
      console.error(`[ComingSoon] Validation failed:`, newErrors);
      setErrors(newErrors);
      return;
    }

    setStatus("loading");
    console.log(`[ComingSoon] Submitting signup: source=${source}, email=${email}`);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          source,
          sourcePath: `/${source}`,
          marketingOptIn,
        }),
      });

      const data = await res.json();
      console.log(`[ComingSoon] Response:`, data);

      if (res.ok) {
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
    <div className="min-h-[70vh] flex items-center justify-center bg-background py-16 px-4">
      <div className="text-center max-w-md w-full">
        <div className="text-7xl mb-8">{emoji}</div>
        <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
          {title}
        </h1>
        <p className="text-lg text-text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
        <p className="text-primary font-semibold text-lg mb-10">Coming Soon!</p>

        {status === "success" ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-green-800">
            <div className="text-3xl mb-3">🎉</div>
            <p className="font-semibold text-lg">{message}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-8 border border-border">
          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            <p className="text-sm text-text-secondary text-center mb-4">
              Be the first to know when we launch. Sign up below.
            </p>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
              />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-text-primary mb-1.5">
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                />
                {errors.firstName && <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-text-primary mb-1.5">
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Smith"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition"
                />
                {errors.lastName && <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => { setMarketingOptIn(e.target.checked); if (errors.marketingOptIn) { setErrors((prev) => { const next = { ...prev }; delete next.marketingOptIn; return next; }); } }}
                  className="checkbox checkbox-sm checkbox-primary mt-0.5"
                />
                <span className="text-sm text-text-secondary">
                  I want to hear about new quiz packs, quiz questions, and quiz events
                </span>
              </label>
              {errors.marketingOptIn && <p className="text-red-600 text-sm ml-8">{errors.marketingOptIn}</p>}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => { setTermsAccepted(e.target.checked); if (errors.termsAccepted) { setErrors((prev) => { const next = { ...prev }; delete next.termsAccepted; return next; }); } }}
                  className="checkbox checkbox-sm checkbox-primary mt-0.5"
                />
                <span className="text-sm text-text-secondary">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:underline" data-action={`${source}_terms_link`}>
                    terms and conditions
                  </Link>
                </span>
              </label>
              {errors.termsAccepted && <p className="text-red-600 text-sm ml-8">{errors.termsAccepted}</p>}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(e) => { setPrivacyAccepted(e.target.checked); if (errors.privacyAccepted) { setErrors((prev) => { const next = { ...prev }; delete next.privacyAccepted; return next; }); } }}
                  className="checkbox checkbox-sm checkbox-primary mt-0.5"
                />
                <span className="text-sm text-text-secondary">
                  I agree to the{" "}
                  <Link href="/privacy" className="text-primary hover:underline" data-action={`${source}_privacy_link`}>
                    privacy policy
                  </Link>
                </span>
              </label>
              {errors.privacyAccepted && <p className="text-red-600 text-sm ml-8">{errors.privacyAccepted}</p>}
            </div>

            {status === "error" && (
              <p className="text-red-600 text-sm text-center">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              data-action={`coming_soon_signup_${source}`}
              name={`coming_soon_signup_${source}`}
              className="w-full bg-primary text-white px-6 py-3.5 rounded-lg font-semibold text-base hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {status === "loading" ? "Signing up..." : "Notify Me"}
            </button>
          </form>
          </div>
        )}
      </div>
    </div>
  );
}
