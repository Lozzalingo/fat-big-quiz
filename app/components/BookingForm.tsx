"use client";

/**
 * Fat Big Quiz BookingForm - thin wrapper around the shared @lozzalingo/booking-form package.
 * Provides FBQ-specific configuration (API adapter, image URLs, contact email, etc.).
 */

import { useEffect, useMemo, useState } from "react";
import SharedBookingForm from "@lozzalingo/booking-form";
import SchemaForm, { useFormSchema } from "@lozzalingo/booking-form/schema";
import { DEFAULT_BOOKING_CONFIG } from "@lozzalingo/booking-form/defaults";
import { createFBQBookingApi } from "@/lib/booking-form-api";

// Re-export types that consumers (e.g. admin page) may need
export { DEFAULT_BOOKING_CONFIG } from "@lozzalingo/booking-form/defaults";
export type { BookingConfig, BookingAddOn, BookingFormSection, TaskSectionTypeConfig } from "@lozzalingo/booking-form/types";

const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const FOLDER = process.env.NEXT_PUBLIC_DO_SPACES_FOLDER || "fat-big-quiz";
// SharedCalendar fetches `${calendarApiBaseUrl}/api/calendar/time-slots/...`,
// now served by the Events Manager compat layer via the /em rewrite.
const API_BASE = process.env.NEXT_PUBLIC_EVENTS_API_BASE || "/em";

function getImageUrl(filename?: string | null): string {
  if (!filename) return "";
  if (filename.startsWith("http")) return filename;
  return `${CDN}/${FOLDER}/events/${filename}`;
}

// FBQ-specific default config overrides
const FBQ_CONFIG = {
  ...DEFAULT_BOOKING_CONFIG,
  whatsIncluded: [
    "Professional quiz host",
    "Full A/V setup (screen, speakers, microphone)",
    "Interactive quiz rounds with multimedia",
    "Scoring and leaderboard management",
    "Customisable rounds and themes",
  ],
};

type BookingFormProps = {
  preselectedProductSlug?: string;
  preselectedLocationSlug?: string;
  showModeToggle?: boolean;
  showEventSelector?: boolean;
};

export default function BookingForm({
  preselectedProductSlug,
  preselectedLocationSlug,
  showModeToggle = true,
  showEventSelector = true,
}: BookingFormProps) {
  const api = useMemo(() => createFBQBookingApi(), []);

  // Flag-gated schema-driven form (OFF by default). Enabled via
  // NEXT_PUBLIC_USE_SCHEMA_FORM=1 or a ?schemaForm=1 query parameter.
  // Query param is read in an effect so SSR output stays deterministic.
  const envFlag = process.env.NEXT_PUBLIC_USE_SCHEMA_FORM === "1";
  const [queryFlag, setQueryFlag] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("schemaForm=1")) {
      setQueryFlag(true);
    }
  }, []);
  const useSchemaForm = envFlag || queryFlag;

  const { schema, error: schemaError } = useFormSchema(API_BASE, { enabled: useSchemaForm });

  // On schema fetch error, fall back to the legacy shared form.
  if (useSchemaForm && !schemaError) {
    if (!schema) {
      // Still loading the schema; avoid flashing the legacy form.
      return <div className="py-12 text-center text-text-secondary">Loading booking form...</div>;
    }
    return (
      <SchemaForm
        api={api}
        apiBaseUrl={API_BASE}
        getImageUrl={getImageUrl}
        contactEmail="info@fatbigquiz.com"
        calendarApiBaseUrl={API_BASE}
        preselectedProductSlug={preselectedProductSlug}
        preselectedLocationSlug={preselectedLocationSlug}
        schema={schema}
      />
    );
  }

  return (
    <SharedBookingForm
      api={api}
      defaultConfig={FBQ_CONFIG}
      getImageUrl={getImageUrl}
      publicEventPath="/tickets"
      contactEmail="info@fatbigquiz.com"
      calendarApiBaseUrl={API_BASE}
      preselectedProductSlug={preselectedProductSlug}
      preselectedLocationSlug={preselectedLocationSlug}
      showModeToggle={showModeToggle}
      showEventSelector={showEventSelector}
    />
  );
}
