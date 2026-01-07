import { NextRequest, NextResponse } from "next/server";

// CDN configuration
const DO_SPACES_CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT || "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com";
const DO_SPACES_FOLDER = process.env.DO_SPACES_FOLDER || "fat-big-quiz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ purchaseId: string; token: string }> }
) {
  try {
    const { purchaseId, token } = await params;
    const { searchParams } = new URL(request.url);
    const fileIndex = parseInt(searchParams.get("file") || "0", 10);

    // Verify the purchase exists and get file info
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases/${purchaseId}`
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    const purchase = await response.json();

    // Check download limit
    if (
      purchase.product.downloadLimit &&
      purchase.downloadCount > purchase.product.downloadLimit
    ) {
      return NextResponse.json(
        { error: "Download limit exceeded" },
        { status: 403 }
      );
    }

    // Get the download file path - handle both single file and JSON array
    const downloadFileData = purchase.product.downloadFile;
    if (!downloadFileData) {
      return NextResponse.json(
        { error: "No download file available" },
        { status: 404 }
      );
    }

    // Parse download files - could be JSON array or single filename
    let downloadFiles: string[];
    try {
      downloadFiles = JSON.parse(downloadFileData);
      if (!Array.isArray(downloadFiles)) {
        downloadFiles = [downloadFileData];
      }
    } catch {
      // Not JSON, treat as single filename
      downloadFiles = [downloadFileData];
    }

    // Get the requested file
    if (fileIndex < 0 || fileIndex >= downloadFiles.length) {
      return NextResponse.json(
        { error: "Invalid file index" },
        { status: 400 }
      );
    }

    const downloadFile = downloadFiles[fileIndex];

    // If it's already a full URL (CDN or other), redirect directly
    if (downloadFile.startsWith("http")) {
      return NextResponse.redirect(downloadFile);
    }

    // Construct the CDN URL for the file
    // Files are stored as: fat-big-quiz/downloads/filename.ext
    const cdnUrl = `${DO_SPACES_CDN_ENDPOINT}/${DO_SPACES_FOLDER}/downloads/${downloadFile}`;

    // Redirect to CDN for fast download
    return NextResponse.redirect(cdnUrl);
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Error processing download" },
      { status: 500 }
    );
  }
}
