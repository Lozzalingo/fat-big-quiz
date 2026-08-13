/**
 * Get the API base URL for fetch calls.
 * Uses NEXT_PUBLIC_API_BASE_URL env var with localhost fallback.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}
