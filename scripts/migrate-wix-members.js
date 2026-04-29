/**
 * Wix Members -> Fat Big Quiz Subscriber Migration
 *
 * Fetches all SUBSCRIBED contacts from the Wix Contacts API and inserts
 * them into the FBQ Subscriber table via Prisma.
 *
 * Usage:
 *   node scripts/migrate-wix-members.js                # Full migration
 *   node scripts/migrate-wix-members.js --dry-run      # Preview only (no DB writes)
 *
 * Prerequisites:
 *   - MySQL running with fat_big_quiz database
 *   - cd server && npx prisma generate
 *   - .env configured in server/ directory
 *
 * IMPORTANT: Must be run from the fat-big-quiz root directory:
 *   node scripts/migrate-wix-members.js
 */

const path = require("path");

// Resolve server directory (the correct Prisma client lives here)
const SERVER_DIR = path.join(__dirname, "../server");

// Load .env from server directory BEFORE requiring Prisma
require(path.join(SERVER_DIR, "node_modules/dotenv")).config({
  path: path.join(SERVER_DIR, ".env"),
});

// Use the server's Prisma client (MySQL)
const { PrismaClient } = require(path.join(
  SERVER_DIR,
  "node_modules/@prisma/client"
));

const prisma = new PrismaClient();

// ============================================================
// CONFIG
// ============================================================

const WIX_API_KEY =
  "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjg1ZmNjNmM1LWY0MjMtNGZiZC1iMDUxLWE2YmNmYWQxN2YwOFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImRkY2QyYWU3LTI3NWYtNGNkMi05ODhiLTA0NGVmZTZiODYyMFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI1MWRjYjQ2YS02Njg4LTQ0MTItODU5ZC0zZmRlZGNhYjU4ZjRcIn19IiwiaWF0IjoxNzcyMTQyMTAyfQ.k6d3-8IZtorDoZXbNbGbM37d8GKrih0xaRJHxPnoVCfbsYjujcPN2HLpbnS3T_6sl1SZvPr3zANhLKN7Dt6S9mTHhn5734xUqoQ219ersCiajEWLBIDDHaJa9oB-GX91ugtf1vV6u2Rj8HlvdXEdsXETO8vk-T6nX2DKrErls1o3AlGTN4Hk9VyBS9jnZKmw5C5NLM8I5lGQNI6joA2uEz-kFdnanFiQi7iDTaqkkNCeonCbXZQAfIOBRx0P2eumSLa8L7LsAVA6MlxBPlE7Lf42iniWDYVzAzdRB_SoAIy0nGMU2xpfkWYqUiYEEbNGJcKiuUuO0KJy-Kuwqtyt6g";
const WIX_SITE_ID = "dccd578c-7e56-4ae6-8056-8f526e672ff8";
const WIX_CONTACTS_API = "https://www.wixapis.com/contacts/v4/contacts/query";
const PAGE_SIZE = 100;

// ============================================================
// CLI FLAGS
// ============================================================

const DRY_RUN = process.argv.includes("--dry-run");

// ============================================================
// HELPERS
// ============================================================

/**
 * Fetch a single page of subscribed contacts from Wix Contacts API
 */
async function fetchSubscribedContactsPage(offset) {
  console.log(`[Migration] Fetching contacts page offset=${offset}, limit=${PAGE_SIZE}`);

  const response = await fetch(WIX_CONTACTS_API, {
    method: "POST",
    headers: {
      Authorization: WIX_API_KEY,
      "wix-site-id": WIX_SITE_ID,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: {
        filter: {
          "info.extendedFields.emailSubscriptions.subscriptionStatus":
            "SUBSCRIBED",
        },
        paging: { limit: PAGE_SIZE, offset },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[Migration] Wix API error ${response.status}: ${errorText}`
    );
  }

  const data = await response.json();
  return {
    contacts: data.contacts || [],
    total: data.pagingMetadata?.total || 0,
    hasNext: data.pagingMetadata?.hasNext || false,
  };
}

/**
 * Fetch ALL subscribed contacts from Wix (handles pagination)
 */
async function fetchAllSubscribedContacts() {
  console.log("[Migration] Starting to fetch all subscribed contacts from Wix...");

  const allContacts = [];
  let offset = 0;
  let total = 0;
  let hasNext = true;

  while (hasNext) {
    const page = await fetchSubscribedContactsPage(offset);
    total = page.total;
    allContacts.push(...page.contacts);
    hasNext = page.hasNext;
    offset += PAGE_SIZE;

    console.log(
      `[Migration] Fetched ${allContacts.length}/${total} contacts so far`
    );

    // Small delay to avoid rate limiting
    if (hasNext) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(
    `[Migration] Finished fetching. Total subscribed contacts: ${allContacts.length}`
  );
  return allContacts;
}

/**
 * Extract email from a Wix contact object
 */
function extractEmail(contact) {
  // Primary email is the most reliable source
  const primaryEmail = contact.primaryEmail?.email;
  if (primaryEmail) return primaryEmail.toLowerCase().trim();

  // Fallback to primaryInfo
  const infoEmail = contact.primaryInfo?.email;
  if (infoEmail) return infoEmail.toLowerCase().trim();

  // Fallback to emails array
  const emails = contact.info?.emails?.items;
  if (emails && emails.length > 0) {
    const primary = emails.find((e) => e.primary);
    return (primary?.email || emails[0].email).toLowerCase().trim();
  }

  return null;
}

/**
 * Basic email validation
 */
function isValidEmail(email) {
  if (!email) return false;
  // Basic regex: has @ and at least one dot after @
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================================
// MAIN MIGRATION
// ============================================================

async function migrate() {
  console.log("[Migration] ============================================");
  console.log("[Migration] Wix Members -> FBQ Subscriber Migration");
  console.log(`[Migration] Mode: ${DRY_RUN ? "DRY RUN (no DB writes)" : "LIVE"}`);
  console.log("[Migration] ============================================");
  console.log("");

  // 1. Fetch all subscribed contacts from Wix
  const contacts = await fetchAllSubscribedContacts();

  // 2. Extract and deduplicate emails
  const emailMap = new Map(); // email -> contact (deduped)
  let noEmailCount = 0;
  let invalidEmailCount = 0;
  let duplicateCount = 0;

  for (const contact of contacts) {
    const email = extractEmail(contact);

    if (!email) {
      noEmailCount++;
      continue;
    }

    if (!isValidEmail(email)) {
      console.log(`[Migration] Skipping invalid email: "${email}"`);
      invalidEmailCount++;
      continue;
    }

    if (emailMap.has(email)) {
      duplicateCount++;
      continue;
    }

    emailMap.set(email, contact);
  }

  const uniqueEmails = Array.from(emailMap.entries());

  console.log("");
  console.log("[Migration] --- Pre-migration Summary ---");
  console.log(`[Migration] Total subscribed contacts from Wix: ${contacts.length}`);
  console.log(`[Migration] Contacts without email: ${noEmailCount}`);
  console.log(`[Migration] Invalid emails skipped: ${invalidEmailCount}`);
  console.log(`[Migration] Duplicate emails removed: ${duplicateCount}`);
  console.log(`[Migration] Unique valid emails to migrate: ${uniqueEmails.length}`);
  console.log("");

  if (DRY_RUN) {
    console.log("[Migration] DRY RUN - listing emails that would be migrated:");
    for (const [email] of uniqueEmails) {
      console.log(`[Migration]   ${email}`);
    }
    console.log("");
    console.log("[Migration] DRY RUN complete. No database changes made.");
    return;
  }

  // 3. Insert into FBQ Subscriber table
  let migrated = 0;
  let skippedExisting = 0;
  let errors = 0;

  for (const [email, contact] of uniqueEmails) {
    try {
      // Check if subscriber already exists
      const existing = await prisma.subscriber.findUnique({
        where: { email },
      });

      if (existing) {
        skippedExisting++;
        continue;
      }

      // Determine subscribedAt date from contact creation
      const subscribedAt = contact.createdDate
        ? new Date(contact.createdDate)
        : new Date();

      await prisma.subscriber.create({
        data: {
          email,
          subscribedAt,
          optIn: true,
        },
      });

      migrated++;

      // Log progress every 100 records
      if (migrated % 100 === 0) {
        console.log(`[Migration] Progress: ${migrated} subscribers created...`);
      }
    } catch (err) {
      // Handle unique constraint violations gracefully (race condition safety)
      if (err.code === "P2002") {
        skippedExisting++;
        continue;
      }
      console.error(`[Migration] Error inserting ${email}: ${err.message}`);
      errors++;
    }
  }

  // 4. Final summary
  console.log("");
  console.log("[Migration] ============================================");
  console.log("[Migration] MIGRATION COMPLETE");
  console.log("[Migration] ============================================");
  console.log(`[Migration] Total subscribed in Wix:    ${contacts.length}`);
  console.log(`[Migration] Unique valid emails:        ${uniqueEmails.length}`);
  console.log(`[Migration] Successfully migrated:      ${migrated}`);
  console.log(`[Migration] Skipped (already existed):  ${skippedExisting}`);
  console.log(`[Migration] Skipped (no email):         ${noEmailCount}`);
  console.log(`[Migration] Skipped (invalid email):    ${invalidEmailCount}`);
  console.log(`[Migration] Skipped (Wix duplicates):   ${duplicateCount}`);
  console.log(`[Migration] Errors:                     ${errors}`);
  console.log("[Migration] ============================================");
}

// ============================================================
// RUN
// ============================================================

migrate()
  .catch((err) => {
    console.error("[Migration] Fatal error:", err.message);
    console.error(err.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("[Migration] Database connection closed.");
  });
