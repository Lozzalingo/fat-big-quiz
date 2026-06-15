"use client";

import { EventsProvider } from "@lozzalingo/events-ui";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const FOLDER = process.env.NEXT_PUBLIC_DO_SPACES_FOLDER || "fat-big-quiz";

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return (
    <EventsProvider
      apiBase={`${API_BASE}/ev`}
      cdnBase={CDN}
      storageFolder={FOLDER}
      brand={{
        name: "Fat Big Quiz",
        heroTitle: "Live Events",
        heroSubtitle: "Theatrical quiz shows, game shows, and whacky wagers. Book a private event or grab tickets to a public show.",
        ctaHeading: "Want a bespoke event?",
        ctaBody: "We can create a custom quiz show tailored to your group, theme, and budget.",
        ctaLabel: "Enquire Now",
        ctaHref: "/events/on-stage-fat-big-quiz",
        eventsPath: "/events",
        backLabel: "All Events",
        fallbackEmail: "info@fatbigquiz.com",
        termsPath: "/terms",
        marketingOptInText: "I want to hear about new quiz packs, quiz questions, and quiz events.",
        privateFilterDesc: "Book an exclusive quiz show for your team. Choose your package and theme.",
        publicFilterDesc: "Join a scheduled quiz show. Just buy tickets and turn up.",
        allFilterDesc: "Browse everything we offer - private bookings and public events.",
        categories: ["quiz-show", "game-show", "whacky-wager", "public-event"],
      }}
    >
      {children}
    </EventsProvider>
  );
}
