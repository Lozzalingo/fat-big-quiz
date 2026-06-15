"use client";

import React, { useState } from "react";
import { FaCalendarAlt, FaUsers, FaEnvelope, FaPhone, FaBuilding, FaUser, FaCheck, FaPaperPlane } from "react-icons/fa";

interface BookingFormProps {
  productId?: string;
  productName?: string;
  source?: string;
  apiBaseUrl?: string;
  brandColor?: string;
}

const BookingForm: React.FC<BookingFormProps> = ({
  productId,
  productName = "Fat Big Quiz On Stage",
  source = "website",
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
  brandColor = "#7c3aed",
}) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    customerEmail: "",
    customerPhone: "",
    companyName: "",
    groupSize: "",
    eventDate: "",
    bookingType: "PRIVATE",
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState("");

  // Minimum date is 7 days from now
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 7);
  const minDateStr = minDate.toISOString().split("T")[0];

  function validate() {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = "Please enter a valid email address";
    }
    if (!formData.groupSize || parseInt(formData.groupSize) < 1) {
      newErrors.groupSize = "Please enter the number of guests";
    }
    if (!formData.eventDate) {
      newErrors.eventDate = "Please select a preferred date";
    } else {
      const selected = new Date(formData.eventDate);
      if (selected < minDate) {
        newErrors.eventDate = "Bookings require at least 7 days notice";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        customerName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim() || undefined,
        companyName: formData.companyName.trim() || undefined,
        groupSize: parseInt(formData.groupSize),
        eventDate: formData.eventDate,
        bookingType: formData.bookingType,
        message: formData.message.trim() || undefined,
        productId: productId || undefined,
        source,
      };

      console.log("[BookingForm] Submitting booking enquiry:", payload.customerEmail);

      const res = await fetch(`${apiBaseUrl}/api/bookings/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit booking enquiry");
      }

      const booking = await res.json();
      console.log("[BookingForm] Booking created:", booking.bookingNumber);
      setIsSuccess(true);
    } catch (err: any) {
      console.error("[BookingForm] Submission failed:", err.message);
      setServerError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  if (isSuccess) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-border text-center">
        <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaCheck className="text-4xl text-success" />
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-3">Enquiry Received!</h3>
        <p className="text-text-secondary max-w-md mx-auto mb-2">
          Thank you for your interest in <strong>{productName}</strong>.
        </p>
        <p className="text-text-secondary max-w-md mx-auto">
          We will be in touch within 24 hours to discuss your event and provide a quote.
        </p>
        <p className="text-sm text-text-secondary mt-6">
          A confirmation has been sent to <strong>{formData.customerEmail}</strong>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-border">
      <h3 className="text-2xl font-bold text-text-primary mb-2">Enquire About This Event</h3>
      <p className="text-text-secondary mb-8">
        Fill in the form below and we will get back to you within 24 hours with availability and a quote.
      </p>

      {serverError && (
        <div className="bg-error/10 border border-error/30 text-error rounded-lg p-4 mb-6">
          {serverError}
        </div>
      )}

      {/* Name row */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            First Name <span className="text-error">*</span>
          </label>
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.firstName ? "border-error" : "border-border"} focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition`}
            />
          </div>
          {errors.firstName && <p className="text-error text-sm mt-1">{errors.firstName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Last Name <span className="text-error">*</span>
          </label>
          <div className="relative">
            <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.lastName ? "border-error" : "border-border"} focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition`}
            />
          </div>
          {errors.lastName && <p className="text-error text-sm mt-1">{errors.lastName}</p>}
        </div>
      </div>

      {/* Email */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1">
          Email <span className="text-error">*</span>
        </label>
        <div className="relative">
          <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
          <input
            type="email"
            name="customerEmail"
            value={formData.customerEmail}
            onChange={handleChange}
            placeholder="your@email.com"
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.customerEmail ? "border-error" : "border-border"} focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition`}
          />
        </div>
        {errors.customerEmail && <p className="text-error text-sm mt-1">{errors.customerEmail}</p>}
      </div>

      {/* Phone and Company row */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Phone</label>
          <div className="relative">
            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleChange}
              placeholder="Phone number (optional)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">Company / Organisation</label>
          <div className="relative">
            <FaBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              placeholder="Company name (optional)"
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
            />
          </div>
        </div>
      </div>

      {/* Event type and group size */}
      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Event Type <span className="text-error">*</span>
          </label>
          <select
            name="bookingType"
            value={formData.bookingType}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition bg-white"
          >
            <option value="PRIVATE">Private Event (corporate, birthday, etc.)</option>
            <option value="PUBLIC">Public Event (ticketed show)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Number of Guests <span className="text-error">*</span>
          </label>
          <div className="relative">
            <FaUsers className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
            <input
              type="number"
              name="groupSize"
              value={formData.groupSize}
              onChange={handleChange}
              placeholder="Expected guests"
              min="1"
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.groupSize ? "border-error" : "border-border"} focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition`}
            />
          </div>
          {errors.groupSize && <p className="text-error text-sm mt-1">{errors.groupSize}</p>}
        </div>
      </div>

      {/* Preferred date */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-text-primary mb-1">
          Preferred Date <span className="text-error">*</span>
        </label>
        <div className="relative">
          <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/50" />
          <input
            type="date"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            min={minDateStr}
            className={`w-full pl-10 pr-4 py-3 rounded-lg border ${errors.eventDate ? "border-error" : "border-border"} focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition`}
          />
        </div>
        {errors.eventDate && <p className="text-error text-sm mt-1">{errors.eventDate}</p>}
        <p className="text-xs text-text-secondary mt-1">Minimum 7 days notice required</p>
      </div>

      {/* Message */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-primary mb-1">
          Tell us about your event
        </label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Anything you'd like us to know - venue, theme, special requirements, etc."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-lg shadow-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isSubmitting ? (
          <>
            <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            Sending...
          </>
        ) : (
          <>
            <FaPaperPlane />
            Send Enquiry
          </>
        )}
      </button>

      <p className="text-xs text-text-secondary text-center mt-4">
        We will respond within 24 hours. No payment is required at this stage.
      </p>
    </form>
  );
};

export default BookingForm;
