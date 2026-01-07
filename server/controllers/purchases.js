const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

// Generate a secure download token
function generateDownloadToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Create a new purchase record
async function createPurchase(request, response) {
  try {
    const { productId, email, userId, stripeSessionId, stripePaymentId, status } =
      request.body;

    if (!productId || !email) {
      return response.status(400).json({ error: "Missing required fields" });
    }

    // Generate secure download token and set expiration (7 days for guest users)
    const downloadToken = generateDownloadToken();
    const expiresAt = userId ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days for guests

    const purchase = await prisma.purchase.create({
      data: {
        productId,
        email,
        userId: userId || null,
        stripeSessionId: stripeSessionId || null,
        stripePaymentId: stripePaymentId || null,
        downloadToken,
        expiresAt,
        status: status || "completed",
        downloadCount: 0,
      },
    });

    return response.status(201).json(purchase);
  } catch (error) {
    console.error("Error creating purchase:", error);
    return response.status(500).json({ error: "Error creating purchase" });
  }
}

// Get purchase by session ID (for download page)
async function getPurchaseBySessionId(request, response) {
  try {
    const { sessionId } = request.params;

    const purchase = await prisma.purchase.findFirst({
      where: { stripeSessionId: sessionId },
      select: {
        id: true,
        email: true,
        downloadCount: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        stripeSessionId: true,
        product: {
          select: {
            id: true,
            title: true,
            downloadFile: true,
            downloadLimit: true,
            productType: true,
          },
        },
      },
    });

    if (!purchase) {
      return response.status(404).json({ error: "Purchase not found" });
    }

    return response.status(200).json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return response.status(500).json({ error: "Error fetching purchase" });
  }
}

// Get purchase by ID
async function getPurchaseById(request, response) {
  try {
    const { purchaseId } = request.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            downloadFile: true,
            downloadLimit: true,
            productType: true,
          },
        },
      },
    });

    if (!purchase) {
      return response.status(404).json({ error: "Purchase not found" });
    }

    return response.status(200).json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return response.status(500).json({ error: "Error fetching purchase" });
  }
}

// Get purchases by email
async function getPurchasesByEmail(request, response) {
  try {
    const { email } = request.params;

    const purchases = await prisma.purchase.findMany({
      where: { email },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            mainImage: true,
            downloadFile: true,
            productType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return response.status(200).json(purchases);
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return response.status(500).json({ error: "Error fetching purchases" });
  }
}

// Helper to parse download files (handles both single string and JSON array)
function parseDownloadFiles(downloadFile) {
  if (!downloadFile) return [];
  try {
    const parsed = JSON.parse(downloadFile);
    return Array.isArray(parsed) ? parsed : [downloadFile];
  } catch {
    return [downloadFile];
  }
}

// Helper to clean filename (remove timestamp suffix)
function cleanFileName(fileName) {
  return fileName.replace(/_\d{13}(\.[^.]+)$/, "$1");
}

// Increment download count and validate
async function incrementDownload(request, response) {
  try {
    const { purchaseId } = request.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        product: {
          select: {
            downloadFile: true,
            downloadLimit: true,
          },
        },
      },
    });

    if (!purchase) {
      return response.status(404).json({ error: "Purchase not found" });
    }

    // Check download limit
    if (
      purchase.product.downloadLimit &&
      purchase.downloadCount >= purchase.product.downloadLimit
    ) {
      return response.status(403).json({ error: "Download limit exceeded" });
    }

    // Increment download count
    await prisma.purchase.update({
      where: { id: purchaseId },
      data: { downloadCount: { increment: 1 } },
    });

    // Generate signed download URL (valid for 1 hour)
    const downloadFileData = purchase.product.downloadFile;
    if (!downloadFileData) {
      return response.status(404).json({ error: "No download file available" });
    }

    // Create a simple signed token
    const token = crypto
      .createHmac("sha256", process.env.DOWNLOAD_SECRET || "fallback-secret")
      .update(`${purchaseId}-${Date.now()}`)
      .digest("hex");

    // Parse files and create download info for each
    const files = parseDownloadFiles(downloadFileData);
    const downloadFiles = files.map((file, index) => ({
      downloadUrl: `/api/download/${purchaseId}/${token}?file=${index}`,
      fileName: cleanFileName(file),
      originalFileName: file,
    }));

    return response.status(200).json({
      downloadUrl: `/api/download/${purchaseId}/${token}`,
      fileName: files[0] ? cleanFileName(files[0]) : null,
      files: downloadFiles,
      remainingDownloads: purchase.product.downloadLimit
        ? purchase.product.downloadLimit - purchase.downloadCount - 1
        : null,
    });
  } catch (error) {
    console.error("Error incrementing download:", error);
    return response.status(500).json({ error: "Error processing download" });
  }
}

module.exports = {
  createPurchase,
  getPurchaseById,
  getPurchaseBySessionId,
  getPurchasesByEmail,
  incrementDownload,
};
