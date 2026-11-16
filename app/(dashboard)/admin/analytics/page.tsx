import { redirect } from "next/navigation";

/**
 * Analytics - redirects to the centralised Analytics Service.
 * Visitor tracking for fat-big-quiz is handled by lza.js.
 */
export default function AnalyticsPage() {
  redirect("https://analytics.laurence.computer/analytics/dashboard");
}
