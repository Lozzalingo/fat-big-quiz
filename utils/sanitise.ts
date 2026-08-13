/**
 * Sanitise HTML content to prevent XSS attacks.
 * Strips dangerous tags and attributes while preserving safe formatting.
 * Works in both server and client environments.
 */
export function sanitiseHtml(dirty: string): string {
  if (!dirty) return "";

  return dirty
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove event handler attributes (onclick, onerror, onload, etc.)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
    // Remove javascript: URLs
    .replace(/href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, 'href="#"')
    .replace(/src\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "")
    // Remove data: URLs in src attributes (potential XSS vector)
    .replace(/src\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, "")
    // Remove iframe, object, embed, form tags
    .replace(/<\/?(?:iframe|object|embed|form|input|textarea|button)\b[^>]*>/gi, "")
    // Remove style attributes that could contain expressions
    .replace(/style\s*=\s*(?:"[^"]*expression\([^"]*"|'[^']*expression\([^']*')/gi, "");
}
