"use client";

import { EventDetailPage } from "@lozzalingo/events-ui/pages";
import BookingForm from "@/app/components/BookingForm";

export default function EventPage() {
  return (
    <EventDetailPage
      renderPrivateBookingForm={({ productSlug }) => (
        <BookingForm
          productName={productSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          source={`events/${productSlug}`}
        />
      )}
    />
  );
}
