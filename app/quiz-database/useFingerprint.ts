import { useState, useEffect } from "react";

/**
 * Generates and persists a browser fingerprint for anonymous feedback voting.
 * Stored in localStorage so votes persist across sessions.
 */
export function useFingerprint(): string {
  const [fingerprint, setFingerprint] = useState("");

  useEffect(() => {
    const key = "quiz-db-fingerprint";
    let stored = localStorage.getItem(key);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(key, stored);
    }
    setFingerprint(stored);
  }, []);

  return fingerprint;
}
