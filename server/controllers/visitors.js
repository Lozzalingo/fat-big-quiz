/**
 * Visitor Analytics Controller - Uses shared @lozzalingo/analytics package
 */
const { PrismaClient } = require("@prisma/client");
const { createVisitorController } = require("@lozzalingo/analytics/server");

const prisma = new PrismaClient();

const controller = createVisitorController(prisma, {
  siteDomain: 'fatbigquiz.com',
  features: { ecommerce: true },
});

module.exports = controller;
