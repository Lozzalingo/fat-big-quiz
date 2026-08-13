/**
 * Shared API base URL helper.
 * IMPORTANT: This returns the base domain (e.g. https://fatbigquiz.com)
 * without a trailing /api - callers append their own path.
 */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
}

export const API_BASE = getApiBaseUrl();
