"use client";

/**
 * Fat Big Quiz BookingForm - thin wrapper around the shared @lozzalingo/booking-form package.
 * Provides FBQ-specific configuration (API adapter, image URLs, contact email, etc.).
 *
 * Follows the same pattern as BucketRace's BookingForm wrapper.
 */

import { useMemo } from "react";
import SharedBookingForm from "@lozzalingo/booking-form";
import { DEFAULT_BOOKING_CONFIG } from "@lozzalingo/booking-form/defaults";
import { createFBQBookingApi } from "@/lib/booking-form-api";

// Re-export types that consumers may need
export { DEFAULT_BOOKING_CONFIG } from "@lozzalingo/booking-form/defaults";
export type { BookingConfig, BookingAddOn, BookingFormSection, TaskSectionTypeConfig } from "@lozzalingo/booking-form/types";

const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const FOLDER = process.env.NEXT_PUBLIC_DO_SPACES_FOLDER || "fat-big-quiz";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

function getImageUrl(filename?: string | null): string {
  if (!filename) return "";
  if (filename.startsWith("http")) return filename;
  return `${CDN}/${FOLDER}/events/${filename}`;
}

// FBQ-specific default config overrides
const FBQ_CONFIG = {
  ...DEFAULT_BOOKING_CONFIG,
  // FBQ quiz shows are priced differently - enquiry-based for now
  pricePerPerson: 0,
  minPlayers: 10,
  minReserve: 0,
  // No travel zones for quiz shows (host travels to client or virtual)
  travelCharges: {
    local: { label: "Local", pence: 0, canInstantBook: false },
  },
  // Quiz show durations
  durations: [
    { value: "1", label: "1 hour", gameTime: "45 mins", total: "1 hour", minSections: 0 },
    { value: "1.5", label: "1.5 hours", gameTime: "1 hour", total: "1.5 hours", minSections: 0 },
    { value: "2", label: "2 hours", gameTime: "1.5 hours", total: "2 hours", minSections: 0 },
  ],
  // Quiz show group types
  groupTypes: [
    { value: "corporate", label: "Corporate" },
    { value: "birthday", label: "Birthday" },
    { value: "christmas-party", label: "Christmas Party" },
    { value: "team-building", label: "Team Building" },
    { value: "pub-quiz", label: "Pub Quiz Night" },
    { value: "other", label: "Other" },
  ],
  // Not relevant for quiz shows
  styles: [],
  drinkStyles: [],
  firstPlacePrizes: [],
  miscThemes: [],
  whatsIncluded: [
    "Professional quiz host",
    "Full A/V setup (screen, speakers, microphone)",
    "Interactive quiz rounds with multimedia",
    "Scoring and leaderboard management",
    "Customisable rounds and themes",
  ],
  // Simplified sections for quiz show bookings
  bookingSections: [
    { id: "your-details", title: "Your Details", icon: "FaUser", enabled: true, order: 1 },
    { id: "choose-event", title: "Choose Your Quiz", icon: "FaUsers", enabled: true, order: 2, fields: { showEventSelector: true } },
    { id: "group-type", title: "Group Type", icon: "FaTheaterMasks", enabled: true, order: 3 },
    { id: "duration", title: "Duration", icon: "FaClock", enabled: true, order: 4 },
    { id: "date-time", title: "Choose Date & Time", icon: "FaCalendarAlt", enabled: true, order: 5 },
    { id: "message", title: "Tell Us About Your Event", icon: "", enabled: true, order: 6 },
  ],
  // No add-ons for now
  addOns: [],
  // No task sections for quiz shows
  taskSectionTypes: [],
};

type BookingFormProps = {
  preselectedProductSlug?: string;
  showModeToggle?: boolean;
  showEventSelector?: boolean;
};

export default function BookingForm({
  preselectedProductSlug,
  showModeToggle = false,
  showEventSelector = true,
}: BookingFormProps) {
  const api = useMemo(() => createFBQBookingApi(), []);

  return (
    <SharedBookingForm
      api={api}
      defaultConfig={FBQ_CONFIG}
      getImageUrl={getImageUrl}
      publicEventPath={null}
      contactEmail="info@fatbigquiz.com"
      calendarApiBaseUrl={API_BASE}
      preselectedProductSlug={preselectedProductSlug}
      showModeToggle={showModeToggle}
      showEventSelector={showEventSelector}
    />
  );
}
