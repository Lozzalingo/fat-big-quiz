/**
 * Visitor Analytics Controller - Uses shared @lozzalingo/analytics package
 */
const prisma = require("../utils/prisma");
const { createVisitorController } = require("@lozzalingo/analytics/server");

const controller = createVisitorController(prisma, {
  siteDomain: 'fatbigquiz.com',
  features: { ecommerce: true },
});

module.exports = controller;
