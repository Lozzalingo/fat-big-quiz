/**
 * Visitor Analytics Routes - Uses shared @lozzalingo/analytics package
 */
const { PrismaClient } = require("@prisma/client");
const { createVisitorRoutes } = require("@lozzalingo/analytics/server");

const prisma = new PrismaClient();

const router = createVisitorRoutes(prisma, {
  siteDomain: 'fatbigquiz.com',
  features: { ecommerce: true },
});

module.exports = router;
