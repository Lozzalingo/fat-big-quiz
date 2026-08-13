/**
 * Format a date string to UK English format.
 * e.g. "5 April 2026"
 */
export function formatDateUK(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
