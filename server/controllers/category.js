const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const ALLOWED_CATEGORY_TYPES = ["PRODUCT", "BLOG"];

async function createCategory(request, response) {
  try {
    const { name, coverImage, type, metaTitle, metaDescription } = request.body;

    // Validate 'type'
    if (type && !ALLOWED_CATEGORY_TYPES.includes(type)) {
      return response.status(400).json({ error: "Invalid category type" });
    }

    const category = await prisma.category.create({
      data: {
        name,
        coverImage,
        type,
        metaTitle,
        metaDescription
      },
    });

    return response.status(201).json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return response.status(500).json({ error: "Error creating category" });
  }
}

async function updateCategory(request, response) {
  try {
    const { id } = request.params;
    const { name, coverImage, type, metaTitle, metaDescription } = request.body;

    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return response.status(404).json({ error: "Category not found" });
    }

    const dataToUpdate = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (coverImage !== undefined) dataToUpdate.coverImage = coverImage;
    if (metaTitle !== undefined) dataToUpdate.metaTitle = metaTitle;
    if (metaDescription !== undefined) dataToUpdate.metaDescription = metaDescription;

    if (type !== undefined) {
      if (!ALLOWED_CATEGORY_TYPES.includes(type)) {
        return response.status(400).json({ error: "Invalid category type" });
      }
      dataToUpdate.type = type;
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: dataToUpdate,
    });

    return response.status(200).json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    return response.status(500).json({ error: "Error updating category" });
  }
}

async function deleteCategory(request, response) {
  try {
    const { id } = request.params;

    await prisma.category.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting category:", error);
    return response.status(500).json({ error: "Error deleting category" });
  }
}

async function getCategory(request, response) {
  try {
    const { id } = request.params;

    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return response.status(404).json({ error: "Category not found" });
    }

    return response.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return response.status(500).json({ error: "Error fetching category" });
  }
}

async function getAllCategories(request, response) {
  try {
    const { type } = request.query;
    
    // If type is provided, filter by it
    let whereClause = {};
    if (type) {
      whereClause = {
        type: type
      };
    }
    
    const categories = await prisma.category.findMany({
      where: whereClause
    });
    
    return response.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return response.status(500).json({ error: "Error fetching categories" });
  }
}

module.exports = {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategory,
  getAllCategories,
};