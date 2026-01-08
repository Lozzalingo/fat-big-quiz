const { PrismaClient } = require("@prisma/client");
const { uploadToSpaces, deleteFromSpaces } = require("../utils/spaces");

const prisma = new PrismaClient();

// Get all global download files (admin)
async function getAllGlobalFiles(request, response) {
  try {
    const files = await prisma.globalDownloadFile.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return response.status(200).json(files);
  } catch (error) {
    console.error("Error fetching global files:", error);
    return response.status(500).json({ error: "Error fetching global files" });
  }
}

// Get active global download files (for download logic)
async function getActiveGlobalFiles(request, response) {
  try {
    const files = await prisma.globalDownloadFile.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
    return response.status(200).json(files);
  } catch (error) {
    console.error("Error fetching active global files:", error);
    return response.status(500).json({ error: "Error fetching global files" });
  }
}

// Get single global file by ID
async function getGlobalFileById(request, response) {
  try {
    const { id } = request.params;
    const file = await prisma.globalDownloadFile.findUnique({
      where: { id },
    });

    if (!file) {
      return response.status(404).json({ error: "Global file not found" });
    }

    return response.status(200).json(file);
  } catch (error) {
    console.error("Error fetching global file:", error);
    return response.status(500).json({ error: "Error fetching global file" });
  }
}

// Create new global download file
async function createGlobalFile(request, response) {
  try {
    const { title, description } = request.body;

    if (!title) {
      return response.status(400).json({ error: "Title is required" });
    }

    // Get highest displayOrder
    const maxOrder = await prisma.globalDownloadFile.aggregate({
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder || 0) + 1;

    const file = await prisma.globalDownloadFile.create({
      data: {
        title,
        description: description || null,
        fileName: "", // Will be set when file is uploaded
        displayOrder,
        isActive: false, // Start inactive until file is uploaded
      },
    });

    return response.status(201).json(file);
  } catch (error) {
    console.error("Error creating global file:", error);
    return response.status(500).json({ error: "Error creating global file" });
  }
}

// Update global download file
async function updateGlobalFile(request, response) {
  try {
    const { id } = request.params;
    const { title, description, isActive } = request.body;

    const existingFile = await prisma.globalDownloadFile.findUnique({
      where: { id },
    });

    if (!existingFile) {
      return response.status(404).json({ error: "Global file not found" });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) {
      // Only allow activating if file is uploaded
      if (isActive && !existingFile.fileName) {
        return response.status(400).json({ error: "Cannot activate without uploading a file first" });
      }
      updateData.isActive = isActive;
    }

    const file = await prisma.globalDownloadFile.update({
      where: { id },
      data: updateData,
    });

    return response.status(200).json(file);
  } catch (error) {
    console.error("Error updating global file:", error);
    return response.status(500).json({ error: "Error updating global file" });
  }
}

// Delete global download file
async function deleteGlobalFile(request, response) {
  try {
    const { id } = request.params;

    const existingFile = await prisma.globalDownloadFile.findUnique({
      where: { id },
    });

    if (!existingFile) {
      return response.status(404).json({ error: "Global file not found" });
    }

    // Delete file from CDN if exists
    if (existingFile.fileName) {
      try {
        await deleteFromSpaces(existingFile.fileName, "global-bonus");
      } catch (err) {
        console.error("Error deleting file from CDN:", err);
        // Continue with database deletion even if CDN delete fails
      }
    }

    await prisma.globalDownloadFile.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.error("Error deleting global file:", error);
    return response.status(500).json({ error: "Error deleting global file" });
  }
}

// Upload file for global download
async function uploadGlobalFile(request, response) {
  try {
    const { id } = request.params;

    const existingFile = await prisma.globalDownloadFile.findUnique({
      where: { id },
    });

    if (!existingFile) {
      return response.status(404).json({ error: "Global file not found" });
    }

    if (!request.file) {
      return response.status(400).json({ error: "No file uploaded" });
    }

    // Delete old file if exists
    if (existingFile.fileName) {
      try {
        await deleteFromSpaces(existingFile.fileName, "global-bonus");
      } catch (err) {
        console.error("Error deleting old file:", err);
      }
    }

    // Upload new file
    const fileName = await uploadToSpaces(request.file, "global-bonus");

    // Update database
    const file = await prisma.globalDownloadFile.update({
      where: { id },
      data: {
        fileName,
        isActive: true, // Auto-activate when file is uploaded
      },
    });

    return response.status(200).json(file);
  } catch (error) {
    console.error("Error uploading global file:", error);
    return response.status(500).json({ error: "Error uploading file" });
  }
}

// Reorder global download files
async function reorderGlobalFiles(request, response) {
  try {
    const { orderedIds } = request.body;

    if (!Array.isArray(orderedIds)) {
      return response.status(400).json({ error: "orderedIds must be an array" });
    }

    // Update each file's displayOrder
    const updates = orderedIds.map((id, index) =>
      prisma.globalDownloadFile.update({
        where: { id },
        data: { displayOrder: index },
      })
    );

    await prisma.$transaction(updates);

    const files = await prisma.globalDownloadFile.findMany({
      orderBy: { displayOrder: "asc" },
    });

    return response.status(200).json(files);
  } catch (error) {
    console.error("Error reordering global files:", error);
    return response.status(500).json({ error: "Error reordering files" });
  }
}

module.exports = {
  getAllGlobalFiles,
  getActiveGlobalFiles,
  getGlobalFileById,
  createGlobalFile,
  updateGlobalFile,
  deleteGlobalFile,
  uploadGlobalFile,
  reorderGlobalFiles,
};
