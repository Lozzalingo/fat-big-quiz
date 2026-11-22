"use client";

import { EventDetailPage } from "@lozzalingo/events-ui/pages";
import BookingCta from "@/app/components/BookingCta";

export default function EventPage() {
  return (
    <EventDetailPage
      renderPrivateBookingForm={({ productSlug }) => (
        <BookingCta productSlug={productSlug} />
      )}
    />
  );
}
