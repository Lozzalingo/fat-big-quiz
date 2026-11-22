"use client";

import { EventDetailPage } from "@lozzalingo/events-ui/pages";
import BookingForm from "@/app/components/BookingForm";

export default function EventPage() {
  return (
    <EventDetailPage
      renderPrivateBookingForm={({ productSlug }) => (
        <BookingForm
          preselectedProductSlug={productSlug}
          showModeToggle={false}
          showEventSelector={false}
        />
      )}
    />
  );
}
