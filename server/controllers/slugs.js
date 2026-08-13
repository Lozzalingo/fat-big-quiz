const prisma = require("../utils/prisma");

async function getProductBySlug(request, response) {
  try {
    const { slug } = request.params;
    const product = await prisma.product.findUnique({
      where: {
        slug: slug,
      },
      include: {
        legacyCategory: { select: { name: true } },
        shopImages: true,
        quizFormat: true,
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    if (!product) {
      return response.status(404).json({ error: "Product not found" });
    }
    console.log(`[Slugs] Found product: ${product.title} (${slug})`);
    return response.status(200).json(product);
  } catch (error) {
    console.error("[Slugs] Error fetching product by slug:", error);
    return response.status(500).json({ error: "Error fetching product" });
  }
}

module.exports = { getProductBySlug };
