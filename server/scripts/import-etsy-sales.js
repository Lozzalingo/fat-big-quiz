/**
 * Import Etsy Sales from CSV exports into the unified Sale + SaleItem tables.
 *
 * Usage:
 *   node scripts/import-etsy-sales.js                    # Full import
 *   node scripts/import-etsy-sales.js --trial             # First 5 orders only
 *   node scripts/import-etsy-sales.js --dry-run           # Parse and validate, no DB writes
 *   node scripts/import-etsy-sales.js --year 2024         # Single year only
 *
 * Data source: /Users/laurencestephan/Downloads/Etsy Sales/
 * Each year folder contains EtsySoldOrders{YEAR}.csv and EtsySoldOrderItems{YEAR}.csv
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

const ETSY_SALES_DIR = "/Users/laurencestephan/Downloads/Etsy Sales";
const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

// ─── CLI Args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const TRIAL = args.includes("--trial");
const DRY_RUN = args.includes("--dry-run");
const YEAR_FILTER = args.includes("--year") ? parseInt(args[args.indexOf("--year") + 1]) : null;

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a currency string like "1.99" or "0.00" to integer pence.
 */
function toPence(value) {
  if (!value || value === "") return 0;
  const num = parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Parse Etsy date formats: "MM/DD/YY" or "MM/DD/YYYY"
 */
function parseDate(dateStr) {
  if (!dateStr || dateStr === "") return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  let [month, day, year] = parts;
  month = parseInt(month);
  day = parseInt(day);
  year = parseInt(year);

  // Handle 2-digit year
  if (year < 100) {
    year = year >= 50 ? 1900 + year : 2000 + year;
  }

  const date = new Date(year, month - 1, day, 12, 0, 0); // noon to avoid timezone issues
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Parse a CSV line handling quoted fields with commas and escaped quotes.
 */
function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

/**
 * Read and parse a CSV file. Returns array of objects.
 */
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`[Import] File not found, skipping: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || "";
    }
    rows.push(row);
  }

  return rows;
}

// ─── Main Import ───────────────────────────────────────────────────────────────

async function importEtsySales() {
  const startTime = Date.now();
  const years = YEAR_FILTER ? [YEAR_FILTER] : YEARS;

  console.log("[Import] Starting Etsy sales import");
  console.log("[Import] Mode:", DRY_RUN ? "DRY RUN" : TRIAL ? "TRIAL (5 orders)" : "FULL");
  console.log("[Import] Years:", years.join(", "));

  let totalOrders = 0;
  let totalItems = 0;
  let duplicates = 0;
  let errors = 0;

  for (const year of years) {
    const ordersFile = path.join(ETSY_SALES_DIR, String(year), `EtsySoldOrders${year}.csv`);
    const itemsFile = path.join(ETSY_SALES_DIR, String(year), `EtsySoldOrderItems${year}.csv`);

    console.log(`\n[Import] ── ${year} ──────────────────────────────────`);

    // Read orders
    const orders = readCSV(ordersFile);
    if (orders.length === 0) {
      console.log(`[Import] No orders found for ${year}`);
      continue;
    }
    console.log(`[Import] ${orders.length} orders loaded`);

    // Read items and index by Order ID
    const items = readCSV(itemsFile);
    console.log(`[Import] ${items.length} items loaded`);

    const itemsByOrderId = {};
    for (const item of items) {
      const orderId = item["Order ID"];
      if (!orderId) continue;
      if (!itemsByOrderId[orderId]) itemsByOrderId[orderId] = [];
      itemsByOrderId[orderId].push(item);
    }

    // Process orders
    const ordersToProcess = TRIAL ? orders.slice(0, 5) : orders;

    for (const order of ordersToProcess) {
      const orderId = order["Order ID"];
      if (!orderId) {
        console.log("[Import] Skipping row with no Order ID");
        errors++;
        continue;
      }

      try {
        // Check for duplicate
        const existing = await prisma.sale.findUnique({
          where: { externalReceiptId: String(orderId) },
        });

        if (existing) {
          duplicates++;
          continue;
        }

        if (DRY_RUN) {
          totalOrders++;
          const orderItems = itemsByOrderId[orderId] || [];
          totalItems += orderItems.length;
          continue;
        }

        // Parse order data
        const saleDate = parseDate(order["Sale Date"]);
        const orderItems = itemsByOrderId[orderId] || [];

        // Build sale items
        const saleItemsData = orderItems.map((item) => ({
          externalTransactionId: item["Transaction ID"] ? String(item["Transaction ID"]) : null,
          externalListingId: item["Listing ID"] ? String(item["Listing ID"]) : null,
          title: item["Item Name"] || "Untitled Etsy Product",
          sku: item["SKU"] || null,
          quantity: parseInt(item["Quantity"]) || 1,
          unitPrice: toPence(item["Price"]),
          currency: item["Currency"] || "GBP",
          isDigital: true, // All FBQ Etsy products are digital downloads
          variations: item["Variations"] || null,
          couponCode: item["Coupon Code"] || null,
          couponDiscount: toPence(item["Discount Amount"]),
          vatAmount: toPence(item["VAT Paid by Buyer"]),
        }));

        // If no items found in the items CSV, create a single item from the order row
        if (saleItemsData.length === 0) {
          saleItemsData.push({
            title: order["SKU"] || `Etsy Order ${orderId}`,
            quantity: parseInt(order["Number of Items"]) || 1,
            unitPrice: toPence(order["Order Value"]),
            currency: order["Currency"] || "GBP",
            isDigital: true,
            couponCode: order["Coupon Code"] || null,
            couponDiscount: toPence(order["Discount Amount"]),
            vatAmount: 0,
          });
        }

        // Create sale
        const sale = await prisma.sale.create({
          data: {
            channel: "ETSY",
            externalReceiptId: String(orderId),
            buyerEmail: "", // Not in CSV exports (privacy)
            buyerName: order["Full Name"] || null,
            buyerUserId: order["Buyer User ID"] || null,
            paymentMethod: order["Payment Type"] || order["Payment Method"] || null,
            subtotal: toPence(order["Order Value"]),
            shippingCost: toPence(order["Shipping"]),
            shippingDiscount: toPence(order["Shipping Discount"]),
            taxTotal: toPence(order["Sales Tax"]),
            vatTotal: saleItemsData.reduce((sum, item) => sum + item.vatAmount, 0),
            discountTotal: toPence(order["Discount Amount"]),
            grandTotal: toPence(order["Order Total"]),
            processingFees: toPence(order["Card Processing Fees"]),
            orderNet: toPence(order["Order Net"]),
            currency: order["Currency"] || "GBP",
            shippingLine1: order["Street 1"] || null,
            shippingLine2: order["Street 2"] || null,
            shippingCity: order["Ship City"] || null,
            shippingState: order["Ship State"] || null,
            shippingPostalCode: order["Ship Zipcode"] || null,
            shippingCountry: order["Ship Country"] || null,
            status: "COMPLETED",
            paidAt: saleDate,
            completedAt: saleDate,
            items: {
              create: saleItemsData,
            },
          },
        });

        totalOrders++;
        totalItems += saleItemsData.length;

        // Log progress every 100 orders
        if (totalOrders % 100 === 0) {
          console.log(`[Import] Progress: ${totalOrders} orders, ${totalItems} items imported`);
        }
      } catch (err) {
        console.error(`[Import] Error importing order ${orderId}:`, err.message);
        errors++;
      }
    }

    console.log(`[Import] ${year} done`);

    if (TRIAL) {
      console.log("[Import] Trial mode - stopping after first year");
      break;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n[Import] ════════════════════════════════════════════");
  console.log(`[Import] ${DRY_RUN ? "DRY RUN " : ""}COMPLETE in ${duration}s`);
  console.log(`[Import] Orders imported: ${totalOrders}`);
  console.log(`[Import] Items imported:  ${totalItems}`);
  console.log(`[Import] Duplicates skipped: ${duplicates}`);
  console.log(`[Import] Errors: ${errors}`);
  console.log("[Import] ════════════════════════════════════════════");

  await prisma.$disconnect();
}

importEtsySales().catch((err) => {
  console.error("[Import] Fatal error:", err);
  process.exit(1);
});
