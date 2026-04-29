/**
 * Authenticated fetch for admin API calls to Express.
 * Adds the admin API key header automatically.
 */
const ADMIN_API_KEY = process.env.NEXT_PUBLIC_ADMIN_API_KEY;

export async function adminFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (ADMIN_API_KEY) {
    headers.set("x-admin-key", ADMIN_API_KEY);
  }
  return fetch(url, { ...options, headers });
}
