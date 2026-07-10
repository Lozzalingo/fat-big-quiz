"use client";

import { EventsProvider } from "@lozzalingo/events-ui";
import { FaQuestion, FaGamepad, FaDice } from "react-icons/fa";

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
        allFilterDesc: "Browse everything we offer, from quiz shows and game shows to whacky wagers.",
        categories: ["quiz-show", "virtual-quiz", "game-show", "whacky-wager", "public-event"],
        categoryFilters: [
          {
            key: "quiz-shows",
            label: "Fat Big Quiz",
            description: "Theatrical quiz shows, on stage or virtual. Choose your theme.",
            colour: "bg-purple-600",
            icon: <FaQuestion />,
            categories: ["quiz-show", "virtual-quiz"],
          },
          {
            key: "game-shows",
            label: "Game Shows",
            description: "Interactive game shows spanning decades of TV history.",
            colour: "bg-amber-500",
            icon: <FaGamepad />,
            categories: ["game-show"],
          },
          {
            key: "whacky-wager",
            label: "Whacky Wager",
            description: "Fictional betting night with bucket coins on genuinely live events.",
            colour: "bg-emerald-500",
            icon: <FaDice />,
            categories: ["whacky-wager"],
          },
        ],
      }}
    >
      {children}
    </EventsProvider>
  );
}
