import type { BookingFormApi, BookingPayload, NormalizedProduct, NormalizedLocation, CalEvent } from "@lozzalingo/booking-form/types";
import { bookingToCalEvent, type BookingCalendarSource } from "@lozzalingo/booking-form/lib/booking-calendar";
import { API_BASE } from "@/utils/api";

/**
 * Fat Big Quiz implementation of the BookingFormApi interface.
 * Connects the shared BookingForm component to FBQ's API endpoints.
 *
 * FBQ uses the /ev/api path for event products (to avoid clash with
 * the e-commerce Product model).
 */
export function createFBQBookingApi(): BookingFormApi {
  return {
    fetchConfig: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/app-settings/booking_config`);
        if (!res.ok) return null;
        const data = await res.json();
        if (!data?.value) return null;
        const cfg = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
        console.log("[BookingFormApi] Loaded booking config from settings");
        return cfg;
      } catch (err) {
        console.error("[BookingFormApi] Failed to fetch config:", err);
        return null;
      }
    },

    fetchProducts: async () => {
      // FBQ event products live under /ev/api/products
      const res = await fetch(`${API_BASE}/ev/api/products`);
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      // Filter to active products with PRIVATE packages
      const products: NormalizedProduct[] = data
        .filter((p: NormalizedProduct) => p.isActive && p.packages?.some((pkg) => pkg.bookingType === "PRIVATE"))
        .map((p: NormalizedProduct) => ({
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          coverImage: p.coverImage,
          category: p.category,
          duration: p.duration,
          maxGroupSize: p.maxGroupSize,
          isActive: p.isActive,
          packages: p.packages,
        }));
      console.log(`[BookingFormApi] Loaded ${products.length} products`);
      return products;
    },

    fetchLocations: async () => {
      // FBQ does not use locations (quiz shows, not scavenger hunts)
      // Return empty array - the booking form handles this gracefully
      return [] as NormalizedLocation[];
    },

    fetchCalendarBookings: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/bookings?limit=100`);
        if (!res.ok) return [];
        const json = await res.json();
        // API returns { data: [...], pagination: {...} } - extract the array
        const bookings: BookingCalendarSource[] = Array.isArray(json) ? json : (json.data || []);
        const events: CalEvent[] = [];
        for (const b of bookings) {
          const ev = bookingToCalEvent(b, { visibility: "public" });
          if (ev) events.push(ev);
        }
        console.log(`[BookingFormApi] Loaded ${events.length} calendar events`);
        return events;
      } catch (err) {
        console.error("[BookingFormApi] Failed to fetch calendar bookings:", err);
        return [];
      }
    },

    fetchBlockedEvents: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/blocked-events`);
        if (!res.ok) return [];
        const events: CalEvent[] = await res.json();
        console.log(`[BookingFormApi] Loaded ${events.length} blocked events`);
        return events;
      } catch (err) {
        console.error("[BookingFormApi] Failed to fetch blocked events:", err);
        return [];
      }
    },

    submitEnquiry: async (payload: BookingPayload) => {
      const res = await fetch(`${API_BASE}/api/bookings/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        return { success: false, message: errData.message || "Something went wrong." };
      }
      return { success: true, message: "Enquiry submitted! We will be in touch shortly." };
    },

    submitCheckout: async (payload: BookingPayload) => {
      const res = await fetch(`${API_BASE}/api/payments/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        return { error: data.message || data.error || "Something went wrong." };
      }
      return { url: data.url };
    },
  };
}
