"use client";

import { useState, useEffect } from "react";
import { AdminEventsPage } from "@lozzalingo/events-ui/admin/pages";
import { EventsProvider } from "@lozzalingo/events-ui";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
const CDN = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT || "";
const FOLDER = process.env.NEXT_PUBLIC_DO_SPACES_FOLDER || "fat-big-quiz";

export default function AdminEvents() {
  const [adminSecret, setAdminSecret] = useState("");

  useEffect(() => {
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      console.log("[AdminEvents] Localhost detected - using localhost auth");
      setAdminSecret("localhost");
      return;
    }

    // Production: fetch NextAuth JWT
    console.log("[AdminEvents] Fetching auth token for production");
    fetch("/api/auth/token")
      .then((res) => res.json())
      .then((data) => {
        if (data.token) {
          setAdminSecret(data.token);
          console.log("[AdminEvents] Auth token received");
        } else {
          console.error("[AdminEvents] No token returned:", data.error);
        }
      })
      .catch((err) => {
        console.error("[AdminEvents] Token fetch error:", err);
      });
  }, []);

  if (!adminSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <EventsProvider
      apiBase={`${API_BASE}/ev`}
      cdnBase={CDN}
      storageFolder={FOLDER}
      adminSecret={adminSecret}
      brand={{
        name: "Fat Big Quiz",
        eventsPath: "/events",
        categories: ["quiz-show", "game-show", "whacky-wager", "public-event"],
      }}
    >
      <div className="min-h-screen">
        <div className="p-6">
          <AdminEventsPage />
        </div>
      </div>
    </EventsProvider>
  );
}
