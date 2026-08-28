#!/usr/bin/env node

/**
 * Synthetic Monitor - Fat Big Quiz
 *
 * Tests every critical customer workflow against the live site.
 * Runs on a cron schedule and sends an alert email when something breaks.
 *
 * No Playwright needed - pure HTTP requests. Fast, reliable, zero flakiness.
 *
 * Usage:
 *   node scripts/synthetic-monitor.js                    # Run all checks
 *   node scripts/synthetic-monitor.js --alert            # Run + send email alert on failure
 *   node scripts/synthetic-monitor.js --report           # Run + always send summary email
 *   SITE_URL=https://fatbigquiz.com node scripts/synthetic-monitor.js
 *
 * Cron (every 15 minutes):
 *   0,15,30,45 * * * * cd /root/fat-big-quiz && docker exec fatbigquiz_api node scripts/synthetic-monitor.js --alert
 *
 * Exit codes:
 *   0 = all checks passed
 *   1 = one or more checks failed
 */

const crypto = require("crypto");

// ─── Config ────────────────────────────────────────────────────────────────────

const SITE_URL = process.env.SITE_URL || process.env.FRONTEND_URL || "https://fatbigquiz.com";
const API_URL = process.env.API_URL || process.env.API_BASE_URL || "http://localhost:3001";
const ADMIN_KEY = process.env.ADMIN_API_KEY || "";
const CDN_BASE = process.env.DO_SPACES_CDN_ENDPOINT || "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com";
const CDN_FOLDER = process.env.DO_SPACES_FOLDER || "fat-big-quiz";

const TEST_SESSION = process.env.TEST_DOWNLOAD_SESSION || "";
const ALERT_MODE = process.argv.includes("--alert");
const REPORT_MODE = process.argv.includes("--report");
const VERBOSE = process.argv.includes("--verbose") || process.argv.includes("-v");

// Structured logging helper for verbose diagnostics in test output
function log(level, msg) {
  if (VERBOSE || level === "FAIL") {
    console.log(`    [${level}] ${msg}`);
  }
}

// ─── Test definitions ──────────────────────────────────────────────────────────

const tests = [
  // P0 - Revenue critical
  {
    name: "Homepage loads",
    priority: "P0",
    run: async () => {
      const res = await httpGet(`${SITE_URL}/`);
      assertStatus(res, 200);
      assertBodyContains(res, "Fat Big Quiz");
    },
  },
  {
    name: "Shop page loads",
    priority: "P0",
    run: async () => {
      const res = await httpGet(`${SITE_URL}/shop`);
      assertStatus(res, 200);
    },
  },
  {
    name: "Product detail page loads",
    priority: "P0",
    run: async () => {
      // Use first product from the API to test a real slug
      const productsRes = await httpGet(`${API_URL}/api/products`);
      const products = JSON.parse(productsRes.body);
      const productList = products.products || products;
      if (productList.length === 0) throw new Error("No products found in database");

      const slug = productList[0].slug;
      const pageRes = await httpGet(`${SITE_URL}/product/${slug}`);
      assertStatus(pageRes, 200);
    },
  },
  {
    name: "Products API returns data",
    priority: "P0",
    run: async () => {
      const res = await httpGet(`${API_URL}/api/products`);
      assertStatus(res, 200);
      const data = JSON.parse(res.body);
      const products = data.products || data;
      if (!Array.isArray(products) || products.length === 0) {
        throw new Error(`Expected products array with data, got ${products.length || 0} items`);
      }
    },
  },
  {
    name: "Checkout creates Stripe session",
    priority: "P0",
    run: async () => {
      // Get a real product ID from the API
      const productsRes = await httpGet(`${API_URL}/api/products`);
      const products = JSON.parse(productsRes.body);
      const productList = products.products || products;
      const product = productList[0];

      // Try to create a checkout session (should work or return a Stripe error, not 404/500)
      const res = await httpPost(`${SITE_URL}/api/checkout`, {
        items: [{ id: product.id, amount: 1 }],
      });

      // 200 = session created, 400 = validation error, both mean the route works
      // 404 = route not found (Nginx misconfigured), 500 = server crash
      if (res.status === 404) {
        throw new Error("Checkout route returning 404 - Nginx may be routing to Express instead of Next.js");
      }
      if (res.status === 500) {
        const body = JSON.parse(res.body);
        throw new Error(`Checkout 500: ${body.error || "Unknown server error"}`);
      }
    },
  },
  {
    name: "Full download flow (4-step)",
    priority: "P0",
    run: async () => {
      // Uses the test purchase (laurencedotcomputer@gmail.com, no expiry, no download limit)
      // ── Step 1: Lookup purchase by session ID ──
      if (!TEST_SESSION) {
        log("SKIP", "No TEST_DOWNLOAD_SESSION env var set - falling back to endpoint-only check");
        const fakeRes = await httpPost(`${API_URL}/api/purchases/fake-id-12345/download`, {});
        if (fakeRes.status === 500) {
          const body = JSON.parse(fakeRes.body);
          if (body.error && body.error.includes("misconfigured")) {
            throw new Error("Step 2 FAIL: Download endpoint returning 'Server misconfigured' - likely missing DOWNLOAD_SECRET env var");
          }
        }
        return;
      }

      log("INFO", `Step 1: Looking up purchase by session: ${TEST_SESSION.slice(0, 20)}...`);
      const lookupRes = await httpGet(`${API_URL}/api/purchases/session/${TEST_SESSION}`);
      if (lookupRes.status !== 200) {
        throw new Error(`Step 1 FAIL: Purchase lookup returned ${lookupRes.status} (expected 200). Session may not exist or DB is down.`);
      }
      const purchase = JSON.parse(lookupRes.body);
      if (!purchase.id) throw new Error("Step 1 FAIL: Purchase lookup returned no ID");
      if (!purchase.product) throw new Error("Step 1 FAIL: Purchase has no product relation - product may have been deleted");
      if (!purchase.product.downloadFile) throw new Error("Step 1 FAIL: Product has no downloadFile set");

      // Check expiry
      if (purchase.expiresAt && new Date(purchase.expiresAt) < new Date()) {
        throw new Error(`Step 1 FAIL: Test purchase has expired (${purchase.expiresAt}). Renew the test purchase expiresAt.`);
      }

      log("INFO", `Step 1 OK: Purchase ${purchase.id.slice(0, 8)}... for "${purchase.product.title}" (downloads: ${purchase.downloadCount})`);

      // ── Step 2: Request signed download URLs ──
      log("INFO", `Step 2: Requesting download URLs via POST /api/purchases/${purchase.id.slice(0, 8)}../download`);
      const downloadRes = await httpPost(`${API_URL}/api/purchases/${purchase.id}/download`, {});
      if (downloadRes.status === 500) {
        const body = JSON.parse(downloadRes.body);
        const errMsg = body.error || "Unknown";
        if (errMsg.includes("misconfigured")) {
          throw new Error("Step 2 FAIL: DOWNLOAD_SECRET env var missing on server");
        }
        throw new Error(`Step 2 FAIL: Download endpoint returned 500 - ${errMsg}`);
      }
      if (downloadRes.status === 403) {
        throw new Error("Step 2 FAIL: Download limit exceeded on test purchase. Reset downloadCount to 0.");
      }
      if (downloadRes.status === 404) {
        const body = JSON.parse(downloadRes.body);
        throw new Error(`Step 2 FAIL: 404 - ${body.error || "Not found"}. Product may have been deleted.`);
      }
      if (downloadRes.status !== 200) {
        throw new Error(`Step 2 FAIL: Unexpected status ${downloadRes.status}`);
      }

      const downloadData = JSON.parse(downloadRes.body);
      if (!downloadData.files || downloadData.files.length === 0) {
        throw new Error("Step 2 FAIL: No files returned in download response");
      }

      log("INFO", `Step 2 OK: Got ${downloadData.files.length} file(s) - ${downloadData.files.map((f) => f.fileName).join(", ")}`);

      // ── Step 3: Fetch every file (product files + global bonus files) ──
      const failures = [];
      for (let i = 0; i < downloadData.files.length; i++) {
        const file = downloadData.files[i];
        const fileUrl = `${SITE_URL}${file.downloadUrl}`;
        const label = file.isGlobal ? `global: ${file.fileName}` : file.fileName;
        log("INFO", `Step 3 [${i + 1}/${downloadData.files.length}]: Fetching "${label}"...`);

        const fileRes = await httpGet(fileUrl);

        if (fileRes.status === 403) {
          failures.push(`"${label}" - CDN 403 Forbidden (check ACL or subfolder path)`);
          log("FAIL", `Step 3 [${i + 1}]: "${label}" returned 403`);
        } else if (fileRes.status === 404) {
          failures.push(`"${label}" - 404 Not Found (file missing from CDN)`);
          log("FAIL", `Step 3 [${i + 1}]: "${label}" returned 404`);
        } else if (fileRes.status === 200) {
          const contentLength = fileRes.body.length;
          if (contentLength < 100) {
            failures.push(`"${label}" - only ${contentLength} bytes (likely an error page, not a file)`);
            log("FAIL", `Step 3 [${i + 1}]: "${label}" suspiciously small (${contentLength} bytes)`);
          } else {
            log("INFO", `Step 3 [${i + 1}]: "${label}" OK - ${contentLength} bytes, ${fileRes.responseTimeMs}ms`);
          }
        } else if (fileRes.status !== 301 && fileRes.status !== 302) {
          failures.push(`"${label}" - unexpected status ${fileRes.status}`);
          log("FAIL", `Step 3 [${i + 1}]: "${label}" returned ${fileRes.status}`);
        }
      }

      if (failures.length > 0) {
        throw new Error(`Step 3 FAIL: ${failures.length}/${downloadData.files.length} files broken:\n  ${failures.join("\n  ")}`);
      }

      // ── Step 4: Summary ──
      log("INFO", "Step 4 OK: Full download flow verified - purchase lookup, signed URLs, file delivery all working");
    },
  },
  {
    name: "Slug lookup works",
    priority: "P0",
    run: async () => {
      // Get a product slug and verify the slugs API works
      const productsRes = await httpGet(`${API_URL}/api/products`);
      const products = JSON.parse(productsRes.body);
      const productList = products.products || products;
      const slug = productList[0].slug;

      const res = await httpGet(`${API_URL}/api/slugs/${slug}`);
      assertStatus(res, 200);
      const product = JSON.parse(res.body);
      if (!product.title) throw new Error("Slug lookup returned product without title");
    },
  },

  {
    name: "All product download files exist on CDN",
    priority: "P0",
    run: async () => {
      // Fetch ALL products by paginating through every page
      let productList = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const productsRes = await httpGet(`${API_URL}/api/products?page=${page}`);
        assertStatus(productsRes, 200);
        const data = JSON.parse(productsRes.body);
        const items = data.products || data;
        productList = productList.concat(items);
        totalPages = data.totalPages || 1;
        page++;
      }

      log("INFO", `Fetched ${productList.length} products across ${totalPages} page(s)`);

      const missing = [];
      let checked = 0;

      for (const product of productList) {
        if (!product.downloadFile) continue;

        let files;
        try { files = JSON.parse(product.downloadFile); } catch { files = [product.downloadFile]; }
        if (!Array.isArray(files)) files = [files];

        for (const file of files) {
          if (file.startsWith("http")) continue; // Full URLs skip CDN check
          const cdnUrl = `${CDN_BASE}/${CDN_FOLDER}/downloads/${file}`;
          const res = await httpGet(cdnUrl);
          checked++;
          if (res.status === 403 || res.status === 404) {
            missing.push(`${product.title}: ${file} (${res.status})`);
          }
        }
      }

      // Also check global bonus files (from the download flow test if available)
      // The full download flow test already covers these via the purchase response,
      // but we also do a direct CDN check here by pulling global file info from
      // a known product's download response
      if (TEST_SESSION) {
        try {
          const lookupRes = await httpGet(`${API_URL}/api/purchases/session/${TEST_SESSION}`);
          if (lookupRes.status === 200) {
            const purchase = JSON.parse(lookupRes.body);
            const dlRes = await httpPost(`${API_URL}/api/purchases/${purchase.id}/download`, {});
            if (dlRes.status === 200) {
              const dlData = JSON.parse(dlRes.body);
              const globalFiles = dlData.files.filter((f) => f.isGlobal);
              for (const g of globalFiles) {
                const cdnUrl = `${CDN_BASE}/${CDN_FOLDER}/global-bonus/${g.originalFileName}`;
                const res = await httpGet(cdnUrl);
                checked++;
                if (res.status === 403 || res.status === 404) {
                  missing.push(`Global: ${g.fileName} - ${g.originalFileName} (${res.status})`);
                }
              }
            }
          }
        } catch (e) {
          log("INFO", "Could not check global files - skipping");
        }
      }

      log("INFO", `Checked ${checked} files across ${productList.length} products`);

      if (missing.length > 0) {
        throw new Error(`${missing.length} file(s) missing from CDN:\n  ${missing.slice(0, 10).join("\n  ")}${missing.length > 10 ? `\n  ... and ${missing.length - 10} more` : ""}`);
      }
    },
  },

  // P1 - Important
  {
    name: "Blog page loads",
    priority: "P1",
    run: async () => {
      const res = await httpGet(`${SITE_URL}/blog`);
      assertStatus(res, 200);
    },
  },
  {
    name: "Blog API returns posts",
    priority: "P1",
    run: async () => {
      const res = await httpGet(`${API_URL}/api/blog`);
      assertStatus(res, 200);
      const data = JSON.parse(res.body);
      const posts = data.posts || data;
      if (!Array.isArray(posts) || posts.length === 0) {
        throw new Error("Blog API returned no posts");
      }
    },
  },
  {
    name: "CDN images accessible",
    priority: "P1",
    run: async () => {
      // Get a product image filename and check it loads from CDN
      const productsRes = await httpGet(`${API_URL}/api/products`);
      const products = JSON.parse(productsRes.body);
      const productList = products.products || products;
      const img = productList.find((p) => p.mainImage)?.mainImage;
      if (!img) return; // No images to test

      const imgUrl = img.startsWith("http")
        ? img
        : `${CDN_BASE}/${CDN_FOLDER}/products/images/${img}`;
      const res = await httpGet(imgUrl);
      if (res.status === 403 || res.status === 404) {
        throw new Error(`CDN image returned ${res.status}: ${imgUrl}`);
      }
    },
  },
  {
    name: "Auth system healthy",
    priority: "P1",
    run: async () => {
      const res = await httpGet(`${SITE_URL}/api/auth/health`);
      assertStatus(res, 200);
      const data = JSON.parse(res.body);
      if (data.status === "unhealthy") {
        throw new Error(`Auth unhealthy: ${data.error || "unknown"}`);
      }
      if (data.status === "degraded") {
        throw new Error("Auth degraded - missing env vars");
      }
    },
  },
  {
    name: "Webhook endpoint reachable",
    priority: "P1",
    run: async () => {
      // Stripe webhook should return 400 (bad signature), not 404
      const res = await httpPost(`${SITE_URL}/api/webhooks/stripe`, { type: "test" });
      if (res.status === 404) {
        throw new Error("Webhook endpoint returning 404 - Nginx may not be routing to Next.js");
      }
      // 400 = signature check failed (expected), anything except 404/500 is fine
    },
  },

  // P2 - Daily checks
  {
    name: "Env vars configured",
    priority: "P2",
    run: async () => {
      // Hit the ops health endpoint to check the server is configured
      if (!ADMIN_KEY) return; // Skip if no admin key available
      const res = await httpGet(`${API_URL}/api/ops/health`, {
        "x-admin-key": ADMIN_KEY,
      });
      assertStatus(res, 200);
    },
  },
  {
    name: "Sitemap accessible",
    priority: "P2",
    run: async () => {
      const res = await httpGet(`${SITE_URL}/sitemap.xml`);
      assertStatus(res, 200);
    },
  },
];

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

async function httpGet(url, extraHeaders = {}) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "FBQ-SyntheticMonitor/1.0",
        ...extraHeaders,
      },
      redirect: "follow",
    });
    clearTimeout(timeout);
    const body = await res.text();
    return { status: res.status, body, responseTimeMs: Date.now() - start };
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`${url} - ${err.message}`);
  }
}

async function httpPost(url, data, extraHeaders = {}) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FBQ-SyntheticMonitor/1.0",
        ...extraHeaders,
      },
      body: JSON.stringify(data),
      redirect: "follow",
    });
    clearTimeout(timeout);
    const body = await res.text();
    return { status: res.status, body, responseTimeMs: Date.now() - start };
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`POST ${url} - ${err.message}`);
  }
}

function assertStatus(res, expected) {
  if (res.status !== expected) {
    throw new Error(`Expected ${expected}, got ${res.status}`);
  }
}

function assertBodyContains(res, text) {
  if (!res.body.includes(text)) {
    throw new Error(`Response body missing expected text: "${text}"`);
  }
}

// ─── Runner ────────────────────────────────────────────────────────────────────

async function runTest(test) {
  const start = Date.now();
  try {
    await test.run();
    return {
      name: test.name,
      priority: test.priority,
      passed: true,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: test.name,
      priority: test.priority,
      passed: false,
      error: err.message,
      durationMs: Date.now() - start,
    };
  }
}

async function runAllTests() {
  const timestamp = new Date().toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
  });

  console.log(`\n[SyntheticMonitor] Running ${tests.length} checks at ${timestamp}`);
  console.log(`[SyntheticMonitor] Site: ${SITE_URL} | API: ${API_URL}\n`);

  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    const icon = result.passed ? "PASS" : "FAIL";
    const detail = result.passed
      ? `${result.durationMs}ms`
      : result.error;
    console.log(`  [${icon}] ${result.priority} ${result.name} - ${detail}`);
    results.push(result);
  }

  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const p0Failures = failed.filter((r) => r.priority === "P0");

  console.log(`\n[SyntheticMonitor] Results: ${passed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.error(`[SyntheticMonitor] FAILURES: ${failed.map((f) => f.name).join(", ")}`);
    if (p0Failures.length > 0) {
      console.error(`[SyntheticMonitor] CRITICAL: ${p0Failures.length} P0 failure(s)`);
    }
  }

  // Send alerts if configured
  if ((ALERT_MODE && failed.length > 0) || REPORT_MODE) {
    await sendAlertEmail(results, failed, timestamp);
  }

  return failed.length > 0 ? 1 : 0;
}

// ─── Email alerts ──────────────────────────────────────────────────────────────

async function sendAlertEmail(results, failed, timestamp) {
  const adminEmail = process.env.ADMIN_EMAIL || "laurencedotcomputer@gmail.com";
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.error("[SyntheticMonitor] Cannot send alert - RESEND_API_KEY not set");
    return;
  }

  const allPassed = failed.length === 0;
  const p0Failures = failed.filter((r) => r.priority === "P0");

  const subject = allPassed
    ? `[FBQ] All ${results.length} checks passing`
    : `[FBQ ALERT] ${failed.length} check(s) failing${p0Failures.length > 0 ? ` - ${p0Failures.length} CRITICAL` : ""}`;

  const rowsHtml = results
    .sort((a, b) => {
      // Failed first, then by priority
      if (a.passed !== b.passed) return a.passed ? 1 : -1;
      return a.priority.localeCompare(b.priority);
    })
    .map((r) => {
      const statusColour = r.passed ? "#10b981" : "#dc2626";
      const statusText = r.passed ? "PASS" : "FAIL";
      return `<tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${r.priority}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${r.name}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: ${statusColour}; font-weight: 600; font-size: 13px;">${statusText}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${r.passed ? `${r.durationMs}ms` : r.error}</td>
      </tr>`;
    })
    .join("");

  const headerBg = allPassed ? "#10b981" : "#dc2626";
  const headerTitle = allPassed ? "All Checks Passing" : "Synthetic Monitor Alert";
  const headerSub = allPassed
    ? `${results.length} checks healthy - ${timestamp}`
    : `${failed.length} check(s) failing - ${timestamp}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: ${headerBg}; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${headerTitle}</h2>
        <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">${headerSub}</p>
      </div>
      <div style="background: #fff; border: 1px solid #e5e7eb; border-top: none; padding: 0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f9fafb;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Priority</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Check</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Status</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Detail</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="padding: 16px 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
          Site: ${SITE_URL} | API: ${API_URL}
        </div>
      </div>
    </div>
  `;

  const text = results
    .map((r) => `[${r.passed ? "PASS" : "FAIL"}] ${r.priority} ${r.name}${r.error ? ` - ${r.error}` : ""}`)
    .join("\n");

  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "no-reply@fatbigquiz.com",
        to: adminEmail,
        subject,
        html,
        text,
      }),
    });

    if (emailRes.ok) {
      console.log(`[SyntheticMonitor] Alert email sent to ${adminEmail}`);
    } else {
      const err = await emailRes.text();
      console.error(`[SyntheticMonitor] Email send failed: ${emailRes.status} ${err}`);
    }
  } catch (err) {
    console.error(`[SyntheticMonitor] Email send error: ${err.message}`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

runAllTests()
  .then((exitCode) => process.exit(exitCode))
  .catch((err) => {
    console.error("[SyntheticMonitor] Fatal error:", err);
    process.exit(2);
  });
