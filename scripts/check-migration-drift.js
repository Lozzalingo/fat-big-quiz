#!/usr/bin/env node

/**
 * Prisma Migration Drift Checker
 *
 * Compares the Prisma schema against the actual database columns.
 * Flags any fields defined in schema.prisma that are missing from the DB.
 * This prevents P2022 "column does not exist" crashes in production.
 *
 * Usage:
 *   node scripts/check-migration-drift.js
 *   API_BASE=http://localhost:3001 node scripts/check-migration-drift.js
 *
 * Exit codes:
 *   0 = no drift
 *   1 = drift detected (missing columns)
 *   2 = connection error
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCHEMA_PATH = path.join(__dirname, "..", "server", "prisma", "schema.prisma");

function parseSchemaModels(schemaContent) {
  const models = {};
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const body = match[2];
    const fields = [];

    for (const line of body.split("\n")) {
      const trimmed = line.trim();
      // Skip empty lines, comments, @@directives, and relation-only fields
      if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("@@")) continue;

      // Match field definitions: fieldName Type ...
      const fieldMatch = trimmed.match(/^(\w+)\s+(String|Int|Float|Boolean|DateTime|Json|BigInt|Decimal|Bytes)(\??)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2];
        const isOptional = fieldMatch[3] === "?";

        // Check for @map to get the actual DB column name
        const mapMatch = trimmed.match(/@map\("(\w+)"\)/);
        const dbColumn = mapMatch ? mapMatch[1] : fieldName;

        fields.push({ fieldName, fieldType, isOptional, dbColumn });
      }
    }

    // Check for @@map to get actual table name
    const tableMapMatch = body.match(/@@map\("(\w+)"\)/);
    const tableName = tableMapMatch ? tableMapMatch[1] : modelName;

    models[modelName] = { tableName, fields };
  }

  return models;
}

async function checkDrift() {
  console.log("[MigrationDrift] Reading schema from", SCHEMA_PATH);

  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error("[MigrationDrift] Schema file not found:", SCHEMA_PATH);
    process.exit(2);
  }

  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  const models = parseSchemaModels(schema);

  console.log(`[MigrationDrift] Found ${Object.keys(models).length} models in schema`);

  // Use Prisma to introspect the actual DB
  let dbColumns;
  try {
    const serverDir = path.join(__dirname, "..", "server");
    const result = execSync(
      `cd "${serverDir}" && npx prisma db execute --stdin <<'SQL'
SELECT TABLE_NAME, COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, ORDINAL_POSITION;
SQL`,
      { encoding: "utf8", timeout: 30000 }
    );
    dbColumns = result;
  } catch (error) {
    console.error("[MigrationDrift] Could not query database:", error.message);
    console.log("[MigrationDrift] Falling back to prisma migrate status check");

    try {
      const serverDir = path.join(__dirname, "..", "server");
      const status = execSync(`cd "${serverDir}" && npx prisma migrate status 2>&1`, {
        encoding: "utf8",
        timeout: 30000,
      });
      console.log("[MigrationDrift] Prisma migrate status:");
      console.log(status);

      if (status.includes("Following migration") && status.includes("not yet been applied")) {
        console.error("[MigrationDrift] DRIFT DETECTED - unapplied migrations found");
        process.exit(1);
      }

      console.log("[MigrationDrift] No unapplied migrations detected");
      process.exit(0);
    } catch (statusError) {
      console.error("[MigrationDrift] Prisma migrate status failed:", statusError.message);
      process.exit(2);
    }
  }

  // Parse DB columns into a lookup
  const dbColumnSet = new Set();
  for (const line of dbColumns.split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      dbColumnSet.add(`${parts[0]}.${parts[1]}`);
    }
  }

  // Check each model's fields against DB
  const drifts = [];
  for (const [modelName, model] of Object.entries(models)) {
    for (const field of model.fields) {
      const key = `${model.tableName}.${field.dbColumn}`;
      if (!dbColumnSet.has(key)) {
        drifts.push({
          model: modelName,
          table: model.tableName,
          field: field.fieldName,
          column: field.dbColumn,
          type: field.fieldType,
        });
      }
    }
  }

  if (drifts.length > 0) {
    console.error(`\n[MigrationDrift] DRIFT DETECTED - ${drifts.length} missing columns:\n`);
    for (const d of drifts) {
      console.error(`  ${d.model}.${d.field} -> ${d.table}.${d.column} (${d.type}) MISSING`);
    }
    console.error("\nRun 'npx prisma migrate dev' to create and apply a migration.");
    process.exit(1);
  }

  console.log("[MigrationDrift] No drift detected - schema matches database");
  process.exit(0);
}

checkDrift().catch((err) => {
  console.error("[MigrationDrift] Unexpected error:", err);
  process.exit(2);
});
