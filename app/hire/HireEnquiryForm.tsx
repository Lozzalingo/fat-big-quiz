"use client";

import React, { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

interface FormData {
  tier: "the-show" | "unplugged" | "";
  frequency: "weekly" | "monthly" | "yearly" | "";
  preferredDay: string;
  preferredTime: string;
  duration: string;
  venueName: string;
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
  venueName: "",
  venueType: "",
  venueCapacity: "",
  message: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
};

export default function HireEnquiryForm() {
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Venue name *
            </label>
            <input
              type="text"
              name="venueName"
              value={form.venueName}
              onChange={handleChange}
              required
              placeholder="e.g. The Crown & Anchor"
              className="w-full px-4 py-3 rounded-lg border border-border bg-background text-text-primary focus:ring-2 focus:ring-primary focus:border-transparent"
            />
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
