const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { uploadToSpaces, deleteFromSpaces, getKey } = require("../utils/spaces");

/**
 * Get all homepage cards (public - only active ones, ordered)
 */
async function getPublicHomepageCards(request, response) {
  try {
    const cards = await prisma.homepageCard.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });

    return response.json(cards);
  } catch (error) {
    console.error("Error fetching homepage cards:", error);
    return response.status(500).json({ error: "Error fetching homepage cards" });
  }
}

/**
 * Get all homepage cards (admin - all cards)
 */
async function getAllHomepageCards(request, response) {
  try {
    const cards = await prisma.homepageCard.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return response.json(cards);
  } catch (error) {
    console.error("Error fetching homepage cards:", error);
    return response.status(500).json({ error: "Error fetching homepage cards" });
  }
}

/**
 * Get single homepage card by ID
 */
async function getHomepageCardById(request, response) {
  try {
    const { id } = request.params;

    const card = await prisma.homepageCard.findUnique({
      where: { id },
    });

    if (!card) {
      return response.status(404).json({ error: "Homepage card not found" });
    }

    return response.json(card);
  } catch (error) {
    console.error("Error fetching homepage card:", error);
    return response.status(500).json({ error: "Error fetching homepage card" });
  }
}

/**
 * Create new homepage card
 */
async function createHomepageCard(request, response) {
  try {
    const { title, description, price, href, badge, cardType, displayOrder, isActive } = request.body;

    if (!title || !description || !price || !href) {
      return response.status(400).json({ error: "Title, description, price, and href are required" });
    }

    // Get max display order if not provided
    let order = displayOrder;
    if (order === undefined || order === null) {
      const maxOrder = await prisma.homepageCard.aggregate({
        _max: { displayOrder: true },
      });
      order = (maxOrder._max.displayOrder || 0) + 1;
    }

    const card = await prisma.homepageCard.create({
      data: {
        title,
        description,
        price,
        href,
        badge: badge || null,
        cardType: cardType || "DOWNLOAD",
        displayOrder: order,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return response.status(201).json(card);
  } catch (error) {
    console.error("Error creating homepage card:", error);
    return response.status(500).json({ error: "Error creating homepage card" });
  }
}

/**
 * Update homepage card
 */
async function updateHomepageCard(request, response) {
  try {
    const { id } = request.params;
    const { title, description, price, href, image, badge, cardType, displayOrder, isActive } = request.body;

    const existing = await prisma.homepageCard.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Homepage card not found" });
    }

    const card = await prisma.homepageCard.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        price: price !== undefined ? price : existing.price,
        href: href !== undefined ? href : existing.href,
        image: image !== undefined ? image : existing.image,
        badge: badge !== undefined ? badge : existing.badge,
        cardType: cardType !== undefined ? cardType : existing.cardType,
        displayOrder: displayOrder !== undefined ? displayOrder : existing.displayOrder,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    return response.json(card);
  } catch (error) {
    console.error("Error updating homepage card:", error);
    return response.status(500).json({ error: "Error updating homepage card" });
  }
}

/**
 * Delete homepage card
 */
async function deleteHomepageCard(request, response) {
  try {
    const { id } = request.params;

    const existing = await prisma.homepageCard.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Homepage card not found" });
    }

    // Delete image from storage if exists
    if (existing.image && !existing.image.startsWith("http") && !existing.image.startsWith("/")) {
      try {
        const imageKey = getKey(existing.image, "homepage-cards");
        await deleteFromSpaces(imageKey);
        console.log(`Deleted homepage card image: ${imageKey}`);
      } catch (err) {
        console.error("Error deleting image from storage:", err);
      }
    }

    await prisma.homepageCard.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting homepage card:", error);
    return response.status(500).json({ error: "Error deleting homepage card" });
  }
}

/**
 * Upload image for homepage card
 */
async function uploadHomepageCardImage(request, response) {
  try {
    const { id } = request.params;

    if (!request.files || !request.files.uploadedFile) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    const existing = await prisma.homepageCard.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Homepage card not found" });
    }

    // Delete old image if exists
    if (existing.image && !existing.image.startsWith("http") && !existing.image.startsWith("/")) {
      try {
        const oldImageKey = getKey(existing.image, "homepage-cards");
        await deleteFromSpaces(oldImageKey);
        console.log(`Deleted old homepage card image: ${oldImageKey}`);
      } catch (err) {
        console.error("Error deleting old image:", err);
      }
    }

    const uploadedFile = request.files.uploadedFile;
    const contentType = uploadedFile.mimetype;

    // Upload to Spaces
    const result = await uploadToSpaces(
      uploadedFile.data,
      uploadedFile.name,
      "homepage-cards",
      contentType
    );

    // Update card with new image
    const card = await prisma.homepageCard.update({
      where: { id },
      data: {
        image: result.fileName,
      },
    });

    return response.json({
      filename: result.fileName,
      cdnUrl: result.cdnUrl,
      card,
    });
  } catch (error) {
    console.error("Error uploading homepage card image:", error);
    return response.status(500).json({ error: "Error uploading homepage card image" });
  }
}

/**
 * Remove image from homepage card
 */
async function removeHomepageCardImage(request, response) {
  try {
    const { id } = request.params;

    const existing = await prisma.homepageCard.findUnique({
      where: { id },
    });

    if (!existing) {
      return response.status(404).json({ error: "Homepage card not found" });
    }

    // Delete from storage
    if (existing.image && !existing.image.startsWith("http") && !existing.image.startsWith("/")) {
      try {
        const imageKey = getKey(existing.image, "homepage-cards");
        await deleteFromSpaces(imageKey);
        console.log(`Deleted homepage card image: ${imageKey}`);
      } catch (err) {
        console.error("Error deleting from storage:", err);
      }
    }

    // Update card to remove image
    const card = await prisma.homepageCard.update({
      where: { id },
      data: {
        image: null,
      },
    });

    return response.json(card);
  } catch (error) {
    console.error("Error removing homepage card image:", error);
    return response.status(500).json({ error: "Error removing homepage card image" });
  }
}

/**
 * Reorder homepage cards
 */
async function reorderHomepageCards(request, response) {
  try {
    const { cardIds } = request.body;

    if (!Array.isArray(cardIds)) {
      return response.status(400).json({ error: "cardIds must be an array" });
    }

    // Update each card's display order
    const updates = cardIds.map((id, index) =>
      prisma.homepageCard.update({
        where: { id },
        data: { displayOrder: index },
      })
    );

    await Promise.all(updates);

    const cards = await prisma.homepageCard.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return response.json(cards);
  } catch (error) {
    console.error("Error reordering homepage cards:", error);
    return response.status(500).json({ error: "Error reordering homepage cards" });
  }
}

module.exports = {
  getPublicHomepageCards,
  getAllHomepageCards,
  getHomepageCardById,
  createHomepageCard,
  updateHomepageCard,
  deleteHomepageCard,
  uploadHomepageCardImage,
  removeHomepageCardImage,
  reorderHomepageCards,
};
