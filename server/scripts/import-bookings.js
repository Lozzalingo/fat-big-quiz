#!/usr/bin/env node
/**
 * FBQ Booking Import Helper
 * Called by bucketrace/scripts/crm-import.js
 * Reads deals from a JSON file passed as argv[1]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();
const deals = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

(async () => {
  let created = 0, updated = 0;
  for (const d of deals) {
    try {
      if (d.ref) {
        const existing = await prisma.booking.findUnique({ where: { bookingNumber: d.ref } });
        if (existing) {
          await prisma.booking.update({
            where: { bookingNumber: d.ref },
            data: {
              status: 'PAID',
              totalAmount: d.totalPence || null,
              totalPaid: d.totalPence || 0,
              productId: d.productId,
              source: 'legacy-import',
            },
          });
          updated++;
          continue;
        }
      }
      await prisma.booking.create({
        data: {
          bookingNumber: d.bookingNumber,
          bookingType: 'PRIVATE',
          status: 'PAID',
          customerName: d.customerName,
          customerEmail: d.customerEmail,
          customerPhone: d.customerPhone,
          companyName: d.companyName,
          groupSize: d.groupSize,
          eventDate: d.eventDate ? new Date(d.eventDate) : new Date('2020-01-01'),
          totalAmount: d.totalPence || null,
          totalPaid: d.totalPence || 0,
          productId: d.productId,
          source: 'legacy-import',
          notes: d.notes,
        },
      });
      created++;
    } catch (err) {
      console.error('[FBQ] Error:', d.bookingNumber, err.message);
    }
  }
  console.log(JSON.stringify({ created, updated }));
  await prisma.$disconnect();
})();
