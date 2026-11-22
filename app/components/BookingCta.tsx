"use client";

/**
 * BookingCta - links out to the centralised Events Manager hosted booking form.
 * Replaces the old embedded shared BookingForm. The hosted form supports a
 * ?product=<slug> deep link to preselect the event being viewed.
 */

import { FaArrowRight, FaCalendarCheck, FaLock } from "react-icons/fa";

const BOOKING_FORM_BASE =
  process.env.NEXT_PUBLIC_BOOKING_FORM_URL ||
  "https://event-manager.laurence.computer/forms/fat-big-quiz/book";

type BookingCtaProps = {
  productSlug?: string;
};

export default function BookingCta({ productSlug }: BookingCtaProps) {
  const href = productSlug
    ? `${BOOKING_FORM_BASE}?product=${encodeURIComponent(productSlug)}`
    : BOOKING_FORM_BASE;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-lg p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <FaCalendarCheck className="text-xl text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-text-primary">Book This Event</h3>
      </div>
      <p className="text-text-secondary mb-6">
        Choose your date, group size, and package on our booking form. It only
        takes a couple of minutes and we will confirm everything by email.
      </p>
      <a
        href={href}
        id="link_open_booking_form"
        className="inline-flex items-center justify-center gap-2 w-full bg-primary text-white font-bold px-6 py-4 rounded-lg shadow-md transition hover:opacity-90"
      >
        Start Your Booking
        <FaArrowRight />
      </a>
      <p className="flex items-center justify-center gap-2 text-xs text-text-secondary mt-4">
        <FaLock />
        Secure booking, payment powered by Stripe
      </p>
    </div>
  );
}
