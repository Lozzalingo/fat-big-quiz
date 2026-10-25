"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  userName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  subscriptionStatus?: string | null;
  is_super_admin?: boolean;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface LoginResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

interface RegisterResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  token: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<RegisterResult>;
  refreshSession: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  status: "loading",
  token: null,
  login: async () => ({ success: false }),
  logout: async () => {},
  register: async () => ({ success: false }),
  refreshSession: async () => {},
});

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/session`, {
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        setToken(null);
        setStatus("unauthenticated");
        return;
      }

      const data = await res.json();

      if (data.status === "authenticated" && data.user) {
        setUser(data.user);
        setToken(data.token || null);
        setStatus("authenticated");
      } else {
        setUser(null);
        setToken(null);
        setStatus("unauthenticated");
      }
    } catch (err) {
      console.error("[Auth] Session fetch failed:", err);
      setUser(null);
      setToken(null);
      setStatus("unauthenticated");
    }
  }, []);

  // Check session on mount
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Login failed" };
      }

      setUser(data.user);
      setStatus("authenticated");
      return { success: true, user: data.user };
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return { success: false, error: "Login failed" };
    }
  }, []);

  const register = useCallback(async (email: string, password: string): Promise<RegisterResult> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Registration failed" };
      }

      setUser(data.user);
      setStatus("authenticated");
      return { success: true, user: data.user };
    } catch (err) {
      console.error("[Auth] Register error:", err);
      return { success: false, error: "Registration failed" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("[Auth] Logout error:", err);
    }
    setUser(null);
    setToken(null);
    setStatus("unauthenticated");
  }, []);

  const refreshSession = useCallback(async () => {
    await fetchSession();
  }, [fetchSession]);

  return (
    <AuthContext.Provider value={{ user, status, token, login, logout, register, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthProvider;
