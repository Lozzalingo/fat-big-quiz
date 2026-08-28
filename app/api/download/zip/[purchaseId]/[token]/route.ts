import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";

// CDN configuration
const DO_SPACES_CDN_ENDPOINT =
  process.env.DO_SPACES_CDN_ENDPOINT ||
  "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com";
const DO_SPACES_FOLDER = process.env.DO_SPACES_FOLDER || "fat-big-quiz";

// Express API base
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string; token: string }> }
) {
  try {
    const { purchaseId, token } = await params;

    console.log(`[DownloadAll] Zip download requested for purchase: ${purchaseId}`);

    // Verify the purchase exists and get product info from Express API
    const purchaseRes = await fetch(`${API_BASE}/api/purchases/${purchaseId}`);

    if (!purchaseRes.ok) {
      console.error(`[DownloadAll] Purchase not found: ${purchaseId}`);
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    const purchase = await purchaseRes.json();

    // Check download limit
    if (
      purchase.product?.downloadLimit &&
      purchase.downloadCount > purchase.product.downloadLimit
    ) {
      return NextResponse.json(
        { error: "Download limit exceeded" },
        { status: 403 }
      );
    }

    // Gather all files to include in the zip
    const filesToZip: { name: string; cdnUrl: string }[] = [];

    // Product download files
    const downloadFileData = purchase.product?.downloadFile;
    if (downloadFileData) {
      let downloadFiles: string[];
      try {
        downloadFiles = JSON.parse(downloadFileData);
        if (!Array.isArray(downloadFiles)) {
          downloadFiles = [downloadFileData];
        }
      } catch {
        downloadFiles = [downloadFileData];
      }

      for (const file of downloadFiles) {
        const cdnUrl = file.startsWith("http")
          ? file
          : `${DO_SPACES_CDN_ENDPOINT}/${DO_SPACES_FOLDER}/downloads/${file}`;
        const safeName = file.split("/").pop() || file;
        filesToZip.push({ name: safeName, cdnUrl });
      }
    }

    // Global bonus files - fetch active list from Express API
    // The /api/global-files/active endpoint is behind admin middleware in the router,
    // but server-to-server calls bypass Nginx so we call Express directly
    try {
      const globalRes = await fetch(`${API_BASE}/api/global-files/active`);
      if (globalRes.ok) {
        const globalFiles = await globalRes.json();
        for (const gf of globalFiles) {
          const cdnUrl = gf.fileName.startsWith("http")
            ? gf.fileName
            : `${DO_SPACES_CDN_ENDPOINT}/${DO_SPACES_FOLDER}/global-bonus/${gf.fileName}`;
          const safeName = gf.fileName.split("/").pop() || gf.fileName;
          filesToZip.push({ name: safeName, cdnUrl });
        }
      } else {
        console.error(`[DownloadAll] Global files endpoint returned ${globalRes.status}`);
      }
    } catch (globalErr) {
      console.error("[DownloadAll] Failed to fetch global files (non-fatal):", globalErr);
    }

    if (filesToZip.length === 0) {
      console.error(`[DownloadAll] No files to zip for purchase: ${purchaseId}`);
      return NextResponse.json(
        { error: "No files available for download" },
        { status: 404 }
      );
    }

    console.log(`[DownloadAll] Zipping ${filesToZip.length} files for purchase: ${purchaseId}`);

    // Fetch all files from CDN in parallel and add to zip
    const zip = new JSZip();
    const fetchResults = await Promise.allSettled(
      filesToZip.map(async (file) => {
        const res = await fetch(file.cdnUrl);
        if (!res.ok) {
          console.error(`[DownloadAll] CDN fetch failed for ${file.name}: ${res.status}`);
          return null;
        }
        const buffer = await res.arrayBuffer();
        return { name: file.name, buffer };
      })
    );

    let filesAdded = 0;
    for (const result of fetchResults) {
      if (result.status === "fulfilled" && result.value) {
        zip.file(result.value.name, result.value.buffer);
        filesAdded++;
      }
    }

    if (filesAdded === 0) {
      console.error(`[DownloadAll] All CDN fetches failed for purchase: ${purchaseId}`);
      return NextResponse.json(
        { error: "Failed to fetch files from CDN" },
        { status: 502 }
      );
    }

    console.log(`[DownloadAll] Added ${filesAdded}/${filesToZip.length} files to zip`);

    // Generate the zip
    const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });

    // Build a clean zip filename from the product title
    const productTitle = purchase.product?.title || "download";
    const cleanTitle = productTitle
      .replace(/[^a-zA-Z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const zipFileName = `${cleanTitle}-fatbigquiz.zip`;

    console.log(`[DownloadAll] Serving zip: ${zipFileName} (${zipBuffer.byteLength} bytes)`);

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFileName}"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("[DownloadAll] Error:", error);
    return NextResponse.json(
      { error: "Error creating download archive" },
      { status: 500 }
    );
  }
}
