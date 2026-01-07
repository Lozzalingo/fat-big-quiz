const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { uploadToSpaces, deleteFromSpaces, getKey } = require("../utils/spaces");

/**
 * Get all quiz formats
 */
async function getAllQuizFormats(request, response) {
  try {
    const quizFormats = await prisma.quizFormat.findMany({
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    return response.json(quizFormats);
  } catch (error) {
    console.error("Error fetching quiz formats:", error);
    return response.status(500).json({ error: "Error fetching quiz formats" });
  }
}

/**
 * Get single quiz format by ID
 */
async function getQuizFormatById(request, response) {
  try {
    const { id } = request.params;

    const quizFormat = await prisma.quizFormat.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!quizFormat) {
      return response.status(404).json({ error: "Quiz format not found" });
    }

    return response.json(quizFormat);
  } catch (error) {
    console.error("Error fetching quiz format:", error);
    return response.status(500).json({ error: "Error fetching quiz format" });
  }
}

/**
 * Create new quiz format
 */
async function createQuizFormat(request, response) {
  try {
    const { name, displayName, description, displayOrder } = request.body;

    if (!name || !displayName) {
      return response.status(400).json({ error: "Name and displayName are required" });
    }

    // Check if name already exists
    const existing = await prisma.quizFormat.findUnique({
      where: { name },
    });

    if (existing) {
      return response.status(400).json({ error: "A quiz format with this name already exists" });
    }

    const quizFormat = await prisma.quizFormat.create({
      data: {
        name,
        displayName,
        description: description || null,
        displayOrder: displayOrder || 0,
        explainerImages: "[]", // Empty JSON array
      },
    });

    return response.status(201).json(quizFormat);
  } catch (error) {
    console.error("Error creating quiz format:", error);
    return response.status(500).json({ error: "Error creating quiz format" });
  }
}

/**
 * Update quiz format
 */
async function updateQuizFormat(request, response) {
  try {
    const { id } = request.params;
    const { name, displayName, description, displayOrder, explainerImages } = request.body;

    const existing = await prisma.quizFormat.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Quiz format not found" });
    }

    // If name is being changed, check for conflicts
    if (name && name !== existing.name) {
      const nameConflict = await prisma.quizFormat.findUnique({
        where: { name },
      });
      if (nameConflict) {
        return response.status(400).json({ error: "A quiz format with this name already exists" });
      }
    }

    const quizFormat = await prisma.quizFormat.update({
      where: { id },
      data: {
        name: name || existing.name,
        displayName: displayName || existing.displayName,
        description: description !== undefined ? description : existing.description,
        displayOrder: displayOrder !== undefined ? displayOrder : existing.displayOrder,
        explainerImages: explainerImages !== undefined ? explainerImages : existing.explainerImages,
      },
    });

    return response.json(quizFormat);
  } catch (error) {
    console.error("Error updating quiz format:", error);
    return response.status(500).json({ error: "Error updating quiz format" });
  }
}

/**
 * Delete quiz format
 */
async function deleteQuizFormat(request, response) {
  try {
    const { id } = request.params;

    const existing = await prisma.quizFormat.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!existing) {
      return response.status(404).json({ error: "Quiz format not found" });
    }

    // Check if any products are using this format
    if (existing._count.products > 0) {
      return response.status(400).json({
        error: `Cannot delete quiz format: ${existing._count.products} product(s) are using it`,
      });
    }

    // Delete explainer images from storage
    if (existing.explainerImages) {
      try {
        const images = JSON.parse(existing.explainerImages);
        for (const image of images) {
          if (image && !image.startsWith("http")) {
            const imageKey = getKey(image, "quiz-formats/explainers");
            await deleteFromSpaces(imageKey);
            console.log(`Deleted explainer image: ${imageKey}`);
          }
        }
      } catch (err) {
        console.error("Error deleting explainer images:", err);
      }
    }

    await prisma.quizFormat.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting quiz format:", error);
    return response.status(500).json({ error: "Error deleting quiz format" });
  }
}

/**
 * Upload explainer image to quiz format
 */
async function uploadExplainerImage(request, response) {
  try {
    const { id } = request.params;

    if (!request.files || !request.files.uploadedFile) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    const existing = await prisma.quizFormat.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Quiz format not found" });
    }

    const uploadedFile = request.files.uploadedFile;
    const contentType = uploadedFile.mimetype;

    // Upload to Spaces
    const result = await uploadToSpaces(
      uploadedFile.data,
      uploadedFile.name,
      "quiz-formats/explainers",
      contentType
    );

    // Update explainer images array
    let images = [];
    try {
      images = existing.explainerImages ? JSON.parse(existing.explainerImages) : [];
    } catch {
      images = [];
    }

    images.push(result.fileName);

    await prisma.quizFormat.update({
      where: { id },
      data: {
        explainerImages: JSON.stringify(images),
      },
    });

    return response.json({
      filename: result.fileName,
      cdnUrl: result.cdnUrl,
      images,
    });
  } catch (error) {
    console.error("Error uploading explainer image:", error);
    return response.status(500).json({ error: "Error uploading explainer image" });
  }
}

/**
 * Remove explainer image from quiz format
 */
async function removeExplainerImage(request, response) {
  try {
    const { id, index } = request.params;
    const imageIndex = parseInt(index, 10);

    const existing = await prisma.quizFormat.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Quiz format not found" });
    }

    let images = [];
    try {
      images = existing.explainerImages ? JSON.parse(existing.explainerImages) : [];
    } catch {
      images = [];
    }

    if (imageIndex < 0 || imageIndex >= images.length) {
      return response.status(400).json({ error: "Invalid image index" });
    }

    const imageToDelete = images[imageIndex];

    // Delete from storage
    if (imageToDelete && !imageToDelete.startsWith("http")) {
      try {
        const imageKey = getKey(imageToDelete, "quiz-formats/explainers");
        await deleteFromSpaces(imageKey);
        console.log(`Deleted explainer image: ${imageKey}`);
      } catch (err) {
        console.error("Error deleting from storage:", err);
      }
    }

    // Remove from array
    images.splice(imageIndex, 1);

    await prisma.quizFormat.update({
      where: { id },
      data: {
        explainerImages: JSON.stringify(images),
      },
    });

    return response.json({ images });
  } catch (error) {
    console.error("Error removing explainer image:", error);
    return response.status(500).json({ error: "Error removing explainer image" });
  }
}

/**
 * Reorder explainer images
 */
async function reorderExplainerImages(request, response) {
  try {
    const { id } = request.params;
    const { images } = request.body;

    if (!Array.isArray(images)) {
      return response.status(400).json({ error: "Images must be an array" });
    }

    const existing = await prisma.quizFormat.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Quiz format not found" });
    }

    await prisma.quizFormat.update({
      where: { id },
      data: {
        explainerImages: JSON.stringify(images),
      },
    });

    return response.json({ images });
  } catch (error) {
    console.error("Error reordering explainer images:", error);
    return response.status(500).json({ error: "Error reordering explainer images" });
  }
}

module.exports = {
  getAllQuizFormats,
  getQuizFormatById,
  createQuizFormat,
  updateQuizFormat,
  deleteQuizFormat,
  uploadExplainerImage,
  removeExplainerImage,
  reorderExplainerImages,
};
