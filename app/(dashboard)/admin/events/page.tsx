"use client";

import { AdminEventsPage } from "@lozzalingo/events-ui/admin/pages";
import { EventsProvider } from "@lozzalingo/events-ui";
import { DashboardSidebar } from "@/components";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const FOLDER = process.env.NEXT_PUBLIC_DO_SPACES_FOLDER || "fat-big-quiz";

export default function AdminEvents() {
  return (
    <EventsProvider
      apiBase={`${API_BASE}/ev`}
      cdnBase={CDN}
      storageFolder={FOLDER}
      adminSecret="localhost"
      brand={{
        name: "Fat Big Quiz",
        eventsPath: "/events",
        categories: ["quiz-show", "game-show", "whacky-wager", "public-event"],
      }}
    >
      <div className="flex min-h-screen bg-gray-950">
        <DashboardSidebar />
        <main className="flex-1 overflow-auto p-6">
          <AdminEventsPage />
        </main>
      </div>
    </EventsProvider>
  );
}
