import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitise HTML content to prevent XSS attacks.
 * Uses DOMPurify (isomorphic - works server and client side).
 * Safe for use with dangerouslySetInnerHTML.
 */
export function sanitiseHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } });
}
