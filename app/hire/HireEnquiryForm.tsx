"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { FaPaperPlane, FaMapMarkerAlt } from "react-icons/fa";

interface FormData {
  tier: "the-show" | "unplugged" | "";
  frequency: "weekly" | "monthly" | "yearly" | "";
  preferredDay: string;
  preferredTime: string;
  duration: string;
  venueAddress: string;
  venueType: string;
  venueCapacity: string;
  message: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

const INITIAL_FORM: FormData = {
  tier: "",
  frequency: "",
  preferredDay: "",
  preferredTime: "",
  duration: "",
  venueAddress: "",
  venueType: "",
  venueCapacity: "",
  message: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

interface AddressSuggestion {
  label: string;
  raw: Record<string, unknown>;
}

export default function HireEnquiryForm() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address lookup state
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // UK postcode lookup via postcodes.io (free, no API key needed)
  const searchPostcode = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        // Use autocomplete for partial postcodes, lookup for complete ones
        const isFullPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(trimmed);
        let results: AddressSuggestion[] = [];

        if (isFullPostcode) {
          // Full postcode - get exact result
          const res = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`
          );
          const data = await res.json();
          if (data.status === 200 && data.result) {
            const r = data.result;
            const label = [r.postcode, r.admin_ward, r.admin_district, r.region].filter(Boolean).join(", ");
            results = [{ label, raw: r }];
          }
        } else {
          // Partial postcode - autocomplete
          const res = await fetch(
            `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}/autocomplete`
          );
          const data = await res.json();
          if (data.status === 200 && data.result) {
            // Fetch details for each suggestion (up to 5)
            const postcodes = (data.result as string[]).slice(0, 5);
            const lookupRes = await fetch("https://api.postcodes.io/postcodes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ postcodes }),
            });
            const lookupData = await lookupRes.json();
            if (lookupData.status === 200 && lookupData.result) {
              results = lookupData.result
                .filter((item: any) => item.result)
                .map((item: any) => {
                  const r = item.result;
                  const label = [r.postcode, r.admin_ward, r.admin_district, r.region].filter(Boolean).join(", ");
                  return { label, raw: r };
                });
            }
          }
        }

        setAddressSuggestions(results);
        setShowSuggestions(results.length > 0);
        console.log(`[HireEnquiry] Postcode search returned ${results.length} results`);
      } catch (err) {
        console.error("[HireEnquiry] Postcode search failed:", err);
        setAddressSuggestions([]);
      }
    }, 300);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    console.log("[HireEnquiry] Submitting form:", form);

    try {
      const res = await fetch("/api/hire-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      console.log("[HireEnquiry] Form submitted successfully");
      setSubmitted(true);
    } catch (err: any) {
      console.error("[HireEnquiry] Submit failed:", err);
      setError(err.message || "Failed to submit enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-border shadow-lg text-center">
        <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaPaperPlane className="text-2xl text-success" />
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">Enquiry Sent!</h3>
        <p className="text-text-secondary">
          Thanks for your interest. We will get back to you within 24 hours to discuss
          your venue's quiz night.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl p-8 border border-border shadow-lg space-y-6"
    >
      <h3 className="text-xl font-bold text-text-primary">Enquire About Hiring</h3>

      {/* Tier Selection */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Which tier are you interested in? *
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, tier: "the-show" })}
            className={`p-4 rounded-xl border-2 text-left transition ${
              form.tier === "the-show"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="font-bold text-text-primary block">The Show</span>
            <span className="text-xs text-text-secondary">Full production</span>
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, tier: "unplugged" })}
            className={`p-4 rounded-xl border-2 text-left transition ${
              form.tier === "unplugged"
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <span className="font-bold text-text-primary block">Unplugged</span>
            <span className="text-xs text-text-secondary">Elevated pub quiz</span>
          </button>
        </div>
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          How often? *
        </label>
        <select
          name="frequency"
          value={form.frequency}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Select frequency</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly (e.g. annual event)</option>
        </select>
      </div>

      {/* Preferred Day and Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Preferred day
          </label>
          <select
            name="preferredDay"
            value={form.preferredDay}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Any day</option>
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Preferred time
          </label>
          <input
            type="time"
            name="preferredTime"
            value={form.preferredTime}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Preferred duration
        </label>
        <select
          name="duration"
          value={form.duration}
          onChange={handleChange}
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">Not sure yet</option>
          <option value="60">60 minutes</option>
          <option value="90">90 minutes</option>
          <option value="120">2 hours</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* Venue Details */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
          Venue Details
        </h4>
        <div className="space-y-4">
          {/* Venue Address via Postcode Lookup */}
          <div className="relative" ref={suggestionsRef}>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Venue postcode *
            </label>
            <input
              type="text"
              name="venueAddress"
              value={form.venueAddress}
              onChange={(e) => {
                setForm({ ...form, venueAddress: e.target.value });
                searchPostcode(e.target.value);
              }}
              onFocus={() => {
                if (addressSuggestions.length > 0) setShowSuggestions(true);
              }}
              required
              placeholder="e.g. SW1A 1AA"
              autoComplete="off"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                {addressSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-3 text-sm text-text-primary hover:bg-background transition flex items-start gap-2 border-b border-border last:border-0"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, venueAddress: s.label }));
                      setShowSuggestions(false);
                      console.log("[HireEnquiry] Address selected:", s.label);
                    }}
                  >
                    <FaMapMarkerAlt className="text-text-secondary mt-0.5 flex-shrink-0" />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Venue type
              </label>
              <select
                name="venueType"
                value={form.venueType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select type</option>
                <option value="pub">Pub</option>
                <option value="members-club">Members club</option>
                <option value="gym">Gym / Fitness</option>
                <option value="hotel">Hotel</option>
                <option value="coworking">Coworking space</option>
                <option value="restaurant">Restaurant</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Capacity
              </label>
              <input
                type="text"
                name="venueCapacity"
                value={form.venueCapacity}
                onChange={handleChange}
                placeholder="e.g. 80 people"
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Tell us more about your venue
            </label>
            <textarea
              name="message"
              value={form.message}
              onChange={handleChange}
              rows={3}
              placeholder="Any details about the space, what you're looking for, existing quiz night performance, etc."
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
        </div>
      </div>

      {/* Contact Details */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
          Your Details
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Name *
            </label>
            <input
              type="text"
              name="contactName"
              value={form.contactName}
              onChange={handleChange}
              required
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Email *
            </label>
            <input
              type="email"
              name="contactEmail"
              value={form.contactEmail}
              onChange={handleChange}
              required
              placeholder="you@venue.com"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Phone
            </label>
            <input
              type="tel"
              name="contactPhone"
              value={form.contactPhone}
              onChange={handleChange}
              placeholder="Optional"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !form.tier || !form.frequency}
        className="w-full bg-primary text-white font-bold py-4 px-8 rounded-lg shadow-lg transform transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <span className="animate-pulse">Sending...</span>
        ) : (
          <>
            <FaPaperPlane />
            Send Enquiry
          </>
        )}
      </button>

      <p className="text-xs text-text-secondary text-center">
        We will respond within 24 hours. No obligation, no pressure.
      </p>
    </form>
  );
}
