#!/usr/bin/env node
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

async function main() {
  const dataFile = process.argv[2];
  const patches = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  const prisma = new PrismaClient();

  let patched = 0, notFound = 0, refFixed = 0, orgFixed = 0;

  try {
    for (const patch of patches) {
      try {
        let booking = null;

        // 1. Try matching by ref as booking number
        if (patch.ref) {
          booking = await prisma.booking.findUnique({ where: { bookingNumber: patch.ref } });
        }

        // 2. Fallback: match by original combined org string in companyName
        if (!booking && patch.orgRaw) {
          booking = await prisma.booking.findFirst({
            where: { companyName: patch.orgRaw, source: "legacy-import" },
          });
        }

        // 3. Fallback: match by customer name
        if (!booking && patch.customerName) {
          booking = await prisma.booking.findFirst({
            where: { customerName: patch.customerName, source: "legacy-import" },
          });
        }

        // 4. Fallback: match by cleaned company name
        if (!booking && patch.companyName) {
          booking = await prisma.booking.findFirst({
            where: { companyName: patch.companyName, source: "legacy-import" },
          });
        }

        if (!booking) { notFound++; continue; }

        const updateData = {};
        if (patch.timestamp) updateData.createdAt = new Date(patch.timestamp);
        if (patch.startTime) updateData["eventTime"] = patch.startTime;

        // Fix booking number if we extracted a real ref and the current one is auto-generated
        const autoGenPattern = /^(BR|FBQ|KAL)-\d{6}-/;
        if (patch.ref && booking.bookingNumber !== patch.ref && autoGenPattern.test(booking.bookingNumber)) {
          updateData.bookingNumber = patch.ref;
          refFixed++;
        }

        // Fix company name if it still contains the combined ref+org string
        if (patch.companyName !== patch.orgRaw && booking.companyName === patch.orgRaw) {
          updateData.companyName = patch.companyName || null;
          orgFixed++;
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.booking.update({ where: { id: booking.id }, data: updateData });
          patched++;
        }
      } catch (err) {
        console.error("[PatchChild] Error:", patch.ref || patch.customerName || patch.companyName, err.message);
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(JSON.stringify({ patched, notFound, refFixed, orgFixed }));
}

main().catch(err => { console.error("[PatchChild] Fatal:", err); process.exit(1); });