/**
 * Migrate Beta Requests from Python Quiz App to JS Subscriber table.
 *
 * Reads beta_request rows from the production PostgreSQL database used by the
 * Python quiz app (app.fatbigquiz.com) and inserts them into the JS app's
 * Subscriber table with source='quiz-app'.
 *
 * Usage:
 *   QUIZ_APP_DATABASE_URL="postgresql://..." node scripts/migrate-beta-requests.js
 *
 * Options:
 *   --dry-run    Print what would be migrated without writing anything
 *   --notify     Send admin notification email for each migrated subscriber
 */

const { PrismaClient } = require('@prisma/client');
const { Client } = require('pg');
const { sendAdminListNotification } = require('../server/services/email');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const NOTIFY = process.argv.includes('--notify');

async function main() {
  const quizDbUrl = process.env.QUIZ_APP_DATABASE_URL;
  if (!quizDbUrl) {
    console.error('[Migration] QUIZ_APP_DATABASE_URL env var is required');
    console.error('  Example: QUIZ_APP_DATABASE_URL="postgresql://user:pass@host:5432/quiz_app" node scripts/migrate-beta-requests.js');
    process.exit(1);
  }

  console.log('[Migration] Connecting to Python quiz app database...');
  const pgClient = new Client({ connectionString: quizDbUrl });
  await pgClient.connect();

  // Fetch all beta requests
  const { rows: betaRequests } = await pgClient.query(
    'SELECT name, email, source, created_at FROM beta_request ORDER BY created_at ASC'
  );

  console.log(`[Migration] Found ${betaRequests.length} beta requests to migrate`);

  if (betaRequests.length === 0) {
    console.log('[Migration] Nothing to migrate');
    await pgClient.end();
    await prisma.$disconnect();
    return;
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const req of betaRequests) {
    const email = req.email.toLowerCase().trim();
    const name = (req.name || '').trim();
    const source = req.source || 'quiz-app';
    const subscribedAt = req.created_at ? new Date(req.created_at) : new Date();

    // Split name into first/last
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    console.log(`[Migration] Processing: ${name} <${email}> (source: ${source})`);

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would create subscriber: ${email}, firstName=${firstName}, lastName=${lastName}, source=${source}`);
      migrated++;
      continue;
    }

    try {
      // Check if already exists
      const existing = await prisma.subscriber.findUnique({
        where: { email },
      });

      if (existing) {
        console.log(`  [Skip] Already exists: ${email} (source: ${existing.source || 'none'})`);
        skipped++;
        continue;
      }

      await prisma.subscriber.create({
        data: {
          email,
          firstName,
          lastName,
          source,
          sourcePath: '/quiz-app',
          subscribedAt,
          optIn: true,
        },
      });

      console.log(`  [OK] Created subscriber: ${email}`);
      migrated++;

      if (NOTIFY) {
        try {
          await sendAdminListNotification({ email, name: name || undefined, source });
          console.log(`  [Email] Admin notification sent for: ${email}`);
        } catch (emailErr) {
          console.error(`  [Email] Failed for ${email}:`, emailErr.message);
        }
      }
    } catch (err) {
      console.error(`  [Error] Failed to migrate ${email}:`, err.message);
      errors++;
    }
  }

  console.log('\n[Migration] Complete!');
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already existed): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  if (DRY_RUN) {
    console.log('  (DRY RUN - no changes were made)');
  }

  await pgClient.end();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[Migration] Fatal error:', err);
  process.exit(1);
});
