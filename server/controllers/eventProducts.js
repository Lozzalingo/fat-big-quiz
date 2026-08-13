/**
 * Event Products Controller
 * Serves EventProduct data in the format @lozzalingo/events-ui expects.
 * This is a thin adapter that queries the EventProduct model (separate from
 * the e-commerce Product model) and returns JSON matching the events-ui
 * useProducts hook shape.
 */

const prisma = require("../utils/prisma");

const INCLUDE = {
  packages: {
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  },
  images: { orderBy: { sortOrder: "asc" } },
  sections: { orderBy: { displayOrder: "asc" } },
  calendarEvents: {
    where: {
      isPublic: true,
      status: { in: ["SCHEDULED", "LIVE"] },
      startTime: { gte: new Date() },
    },
    orderBy: { startTime: "asc" },
    take: 50,
  },
};

/**
 * GET /products - List all active event products
 */
async function getAllProducts(req, res) {
  try {
    const { category } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;

    const products = await prisma.eventProduct.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: INCLUDE,
    });

    console.log(`[EventProducts] Fetched ${products.length} event products`);
    return res.json(products);
  } catch (error) {
    console.error("[EventProducts] Failed to fetch products:", error.message);
    return res.status(500).json({ error: "Failed to fetch event products" });
  }
}

/**
 * GET /products/slug/:slug - Get event product by slug
 */
async function getProductBySlug(req, res) {
  try {
    const { slug } = req.params;
    const product = await prisma.eventProduct.findUnique({
      where: { slug },
      include: INCLUDE,
    });

    if (!product) {
      console.log(`[EventProducts] Not found: ${slug}`);
      return res.status(404).json({ error: "Event product not found" });
    }

    console.log(`[EventProducts] Fetched: ${product.name}`);
    return res.json(product);
  } catch (error) {
    console.error("[EventProducts] Failed to fetch product:", error.message);
    return res.status(500).json({ error: "Failed to fetch event product" });
  }
}

/**
 * GET /products/:id - Get event product by ID
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.eventProduct.findUnique({
      where: { id },
      include: INCLUDE,
    });

    if (!product) {
      return res.status(404).json({ error: "Event product not found" });
    }

    return res.json(product);
  } catch (error) {
    console.error("[EventProducts] Failed to fetch product:", error.message);
    return res.status(500).json({ error: "Failed to fetch event product" });
  }
}

module.exports = { getAllProducts, getProductBySlug, getProductById };
