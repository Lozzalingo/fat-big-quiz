"use client";

import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/utils/api";

interface User {
  id: string;
  avatar?: string | null;
  role?: string | null;
  [key: string]: unknown;
}

interface UseGetUserByEmailResult {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useGetUserByEmail(email: string | null | undefined): UseGetUserByEmailResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setUser(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const apiBase = getApiBaseUrl();
        const response = await fetch(`${apiBase}/api/users/email/${email}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setUser(data);
        }
      } catch (err) {
        console.error("[User] Failed to fetch user by email:", err);
        if (!cancelled) {
          setError("Failed to fetch user data");
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [email]);

  return { user, loading, error };
}
