const prisma = require("../utils/prisma");
const crypto = require("crypto");

// Generate a secure download token
function generateDownloadToken() {
  return crypto.randomBytes(32).toString("hex");
}

// Create a new purchase record
async function createPurchase(request, response) {
  try {
    const { productId, email, userId, stripeSessionId, stripePaymentId, status } =
      request.body;

    console.log("[Purchase] Creating purchase:", { productId, email, stripeSessionId });

    if (!productId || !email) {
      console.log("[Purchase] Rejected - missing required fields");
      return response.status(400).json({ error: "Missing required fields" });
    }

    // Idempotency check - prevent duplicate purchases for same Stripe session
    if (stripeSessionId) {
      const existing = await prisma.purchase.findFirst({
        where: { stripeSessionId },
      });
      if (existing) {
        console.log("[Purchase] Duplicate session, returning existing:", existing.id);
        return response.status(200).json(existing);
      }
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

    console.log("[Purchase] Created:", purchase.id);
    return response.status(201).json(purchase);
  } catch (error) {
    console.error("[Purchase] Error creating:", error.message);
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
    console.error("[Purchase] Error fetching purchase:", error);
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
    console.error("[Purchase] Error fetching purchase:", error);
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
    console.error("[Purchase] Error fetching purchases:", error);
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
            id: true,
            title: true,
            downloadFile: true,
            downloadLimit: true,
          },
        },
      },
    });

    if (!purchase) {
      console.error('[Purchase] Download failed - purchase not found:', purchaseId);
      return response.status(404).json({ error: "Purchase not found" });
    }

    if (!purchase.product) {
      console.error('[Purchase] Download failed - product missing for purchase:', purchaseId, 'productId:', purchase.productId);
      return response.status(404).json({ error: "Product no longer available" });
    }

    console.log('[Purchase] Download requested for purchase:', purchaseId, 'product:', purchase.product.title);

    // Check download limit
    if (
      purchase.product.downloadLimit &&
      purchase.downloadCount >= purchase.product.downloadLimit
    ) {
      console.log('[Purchase] Download limit exceeded for purchase:', purchaseId, 'count:', purchase.downloadCount, 'limit:', purchase.product.downloadLimit);
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
    const downloadSecret = process.env.DOWNLOAD_SECRET;
    if (!downloadSecret) {
      console.error('[Purchase] DOWNLOAD_SECRET not configured - cannot generate download token');
      return response.status(500).json({ error: 'Server misconfigured' });
    }
    const token = crypto
      .createHmac("sha256", downloadSecret)
      .update(`${purchaseId}-${Date.now()}`)
      .digest("hex");

    // Parse product files and create download info for each
    const productFiles = parseDownloadFiles(downloadFileData);
    const downloadFiles = productFiles.map((file, index) => ({
      downloadUrl: `/api/download/${purchaseId}/${token}?file=${index}`,
      fileName: cleanFileName(file),
      originalFileName: file,
      isGlobal: false,
    }));

    // Fetch active global bonus files
    let globalFiles = [];
    try {
      globalFiles = await prisma.globalDownloadFile.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      });
    } catch (globalErr) {
      console.error('[Purchase] GlobalDownloadFile query failed (non-fatal):', globalErr.message);
      // Non-fatal - continue without global files
    }

    // Add global files to download list (with special marker)
    globalFiles.forEach((globalFile, index) => {
      downloadFiles.push({
        downloadUrl: `/api/download/${purchaseId}/${token}?file=${productFiles.length + index}&global=1`,
        fileName: globalFile.title || cleanFileName(globalFile.fileName),
        originalFileName: globalFile.fileName,
        isGlobal: true,
      });
    });

    return response.status(200).json({
      downloadUrl: `/api/download/${purchaseId}/${token}`,
      fileName: productFiles[0] ? cleanFileName(productFiles[0]) : null,
      files: downloadFiles,
      remainingDownloads: purchase.product.downloadLimit
        ? purchase.product.downloadLimit - purchase.downloadCount - 1
        : null,
    });
  } catch (error) {
    console.error("[Purchase] Error incrementing download for:", request.params.purchaseId);
    console.error("[Purchase] Error details:", error.message);
    console.error("[Purchase] Stack:", error.stack);
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
