/**
 * Authenticated fetch for admin API calls to Express.
 * Relies on the lza_user_{siteId} cookie set when the admin logs in.
 * The Express adminMiddleware validates the cookie server-side (JWT).
 * No API keys are sent from the client -- all auth is cookie-based.
 */
export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: "include",
  });
}
