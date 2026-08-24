/**
 * Scheduled Health Check - Fat Big Quiz
 *
 * Runs every 30 minutes, checks critical pages and API endpoints.
 * Sends an admin alert email if any check fails.
 * Logs results to console with [HealthCheck] prefix.
 */

const cron = require("node-cron");

const SITE_BASE = process.env.FRONTEND_URL || "http://localhost:3000";
const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";

const CRITICAL_CHECKS = [
  { name: "Homepage", url: `${SITE_BASE}/` },
  { name: "Shop", url: `${SITE_BASE}/shop` },
  { name: "Product Detail", url: `${SITE_BASE}/quiz-pack/christmas-quiz` },
  { name: "Blog", url: `${SITE_BASE}/blog` },
  { name: "Products API", url: `${API_BASE}/api/products` },
  { name: "Blog API", url: `${API_BASE}/api/blog` },
];

async function checkEndpoint(name, url, timeoutMs = 15000) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "FBQ-HealthCheck/1.0" },
    });
    clearTimeout(timeout);

    return {
      name,
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 400,
      responseTimeMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name,
      url,
      status: "ERROR",
      ok: false,
      responseTimeMs: Date.now() - start,
      error: error.message || "Unknown error",
    };
  }
}

// Track consecutive failures to avoid spamming emails
let consecutiveFailures = 0;
let lastAlertSent = 0;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between alert emails

async function runHealthCheck(sendAdminAlert) {
  console.log("[HealthCheck] Running scheduled health check");

  const results = await Promise.all(
    CRITICAL_CHECKS.map((check) => checkEndpoint(check.name, check.url))
  );

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  if (failed.length === 0) {
    consecutiveFailures = 0;
    console.log(
      `[HealthCheck] All ${results.length} checks passed`,
      results.map((r) => `${r.name}: ${r.status} (${r.responseTimeMs}ms)`).join(", ")
    );
    return;
  }

  consecutiveFailures++;
  console.error(
    `[HealthCheck] ${failed.length}/${results.length} checks FAILED (streak: ${consecutiveFailures}):`,
    failed.map((f) => `${f.name}: ${f.status} ${f.error || ""}`).join(", ")
  );

  // Send alert email (with cooldown to avoid spam)
  const now = Date.now();
  if (sendAdminAlert && now - lastAlertSent > ALERT_COOLDOWN_MS) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || "laurence.stephan@bucketrace.com";
      const timestamp = new Date().toLocaleString("en-GB", {
        timeZone: "Europe/London",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const failedHtml = failed
        .map(
          (f) =>
            `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: 600;">${f.name}</td>` +
            `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${f.status}</td>` +
            `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${f.responseTimeMs}ms</td>` +
            `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${f.error || "-"}</td></tr>`
        )
        .join("");

      const passedHtml = passed
        .map(
          (p) =>
            `<tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.name}</td>` +
            `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #10b981;">OK (${p.status})</td>` +
            `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.responseTimeMs}ms</td>` +
            `<td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">-</td></tr>`
        )
        .join("");

      const html = `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">Site Health Alert</h2>
            <p style="margin: 4px 0 0; opacity: 0.9;">${failed.length} check(s) failing - ${timestamp}</p>
          </div>
          <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 8px; text-align: left;">Page</th>
                  <th style="padding: 8px; text-align: left;">Status</th>
                  <th style="padding: 8px; text-align: left;">Time</th>
                  <th style="padding: 8px; text-align: left;">Error</th>
                </tr>
              </thead>
              <tbody>
                ${failedHtml}
                ${passedHtml}
              </tbody>
            </table>
            <p style="margin-top: 16px; font-size: 13px; color: #6b7280;">
              Consecutive failures: ${consecutiveFailures}. Next check in 30 minutes.
            </p>
          </div>
        </div>
      `;

      const text = `SITE HEALTH ALERT\n\nFailing: ${failed.map((f) => `${f.name} (${f.status})`).join(", ")}\nPassing: ${passed.map((p) => p.name).join(", ")}\nTime: ${timestamp}\nConsecutive failures: ${consecutiveFailures}`;

      await sendAdminAlert({
        to: adminEmail,
        subject: `[FBQ ALERT] ${failed.length} page(s) down - ${failed.map((f) => f.name).join(", ")}`,
        html,
        text,
      });

      lastAlertSent = now;
      console.log("[HealthCheck] Alert email sent to", adminEmail);
    } catch (emailErr) {
      console.error("[HealthCheck] Failed to send alert email:", emailErr.message);
    }
  }
}

/**
 * Start the scheduled health check.
 * @param {Function} sendEmail - The sendEmail function from the email service
 */
function startHealthCheckScheduler(sendEmail) {
  // Run every 30 minutes
  cron.schedule("*/30 * * * *", () => {
    runHealthCheck(sendEmail).catch((err) => {
      console.error("[HealthCheck] Scheduler error:", err);
    });
  });

  console.log("[HealthCheck] Scheduler started - checks every 30 minutes");

  // Run an initial check after 30 seconds (let the server fully start)
  setTimeout(() => {
    runHealthCheck(sendEmail).catch((err) => {
      console.error("[HealthCheck] Initial check error:", err);
    });
  }, 30000);
}

module.exports = { startHealthCheckScheduler, runHealthCheck };
