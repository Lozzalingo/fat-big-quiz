const prisma = require("../utils/prisma");

async function searchProducts(request, response) {
    try {
        const { query } = request.query;
        if (!query) {
            return response.status(400).json({ error: "Query parameter is required" });
        }

        const searchTerm = query.toLowerCase();

        const products = await prisma.product.findMany({
            where: {
                OR: [
                    { title: { contains: query } },
                    { tags: { contains: query } },
                    { category: { name: { contains: query } } },
                    { categories: { some: { category: { name: { contains: query } } } } },
                    { quizFormat: { displayName: { contains: query } } },
                ]
            },
            take: 50,
            select: {
                id: true,
                title: true,
                slug: true,
                price: true,
                mainImage: true,
                tags: true,
                productType: true,
                category: { select: { id: true, name: true } },
                categories: { include: { category: { select: { id: true, name: true } } } },
                quizFormat: { select: { id: true, displayName: true, slug: true } },
            }
        });

        return response.json(products);
    } catch (error) {
        console.error("[Search] Error searching products:", error);
        return response.status(500).json({ error: "Error searching products" });
    }
}

module.exports = { searchProducts };