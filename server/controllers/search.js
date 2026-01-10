const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
                    {
                        title: {
                            contains: query
                        }
                    },
                    {
                        description: {
                            contains: query
                        }
                    },
                    {
                        // Search in tags JSON string
                        tags: {
                            contains: query
                        }
                    },
                    {
                        // Search by category name (legacy single category)
                        category: {
                            name: {
                                contains: query
                            }
                        }
                    },
                    {
                        // Search by categories (many-to-many)
                        categories: {
                            some: {
                                category: {
                                    name: {
                                        contains: query
                                    }
                                }
                            }
                        }
                    },
                    {
                        // Search by quiz format name
                        quizFormat: {
                            displayName: {
                                contains: query
                            }
                        }
                    }
                ]
            },
            include: {
                category: true,
                categories: {
                    include: {
                        category: true
                    }
                },
                quizFormat: true
            }
        });

        return response.json(products);
    } catch (error) {
        console.error("Error searching products:", error);
        return response.status(500).json({ error: "Error searching products" });
    }
}

module.exports = { searchProducts };