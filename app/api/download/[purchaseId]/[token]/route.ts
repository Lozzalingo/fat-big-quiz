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
    const isGlobal = searchParams.get("global") === "1";
    const globalFileName = searchParams.get("name"); // filename passed for global bonus files

    // Verify the purchase exists and get file info
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/purchases/${purchaseId}`
    );

    if (!response.ok) {
      console.error(`[Download] Purchase not found: ${purchaseId}`);
      return NextResponse.json(
        { error: "Purchase not found" },
        { status: 404 }
      );
    }

    const purchase = await response.json();

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

    let fileName: string;
    let subFolder: string;

    if (isGlobal) {
      // Global bonus file - filename is passed in the URL query param
      if (!globalFileName) {
        console.error("[Download] Global file requested but no name param provided");
        return NextResponse.json(
          { error: "Missing global file name" },
          { status: 400 }
        );
      }
      fileName = globalFileName;
      subFolder = "global-bonus";
      console.log(`[Download] Serving global bonus file: ${fileName}`);
    } else {
      // Product download file
      const downloadFileData = purchase.product?.downloadFile;
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
        downloadFiles = [downloadFileData];
      }

      if (fileIndex < 0 || fileIndex >= downloadFiles.length) {
        console.error(`[Download] File index ${fileIndex} out of range (${downloadFiles.length} files)`);
        return NextResponse.json(
          { error: "Invalid file index" },
          { status: 400 }
        );
      }

      fileName = downloadFiles[fileIndex];
      subFolder = "downloads";
      console.log(`[Download] Serving product file: ${fileName}`);
    }

    // Construct the CDN URL
    const cdnUrl = fileName.startsWith("http")
      ? fileName
      : `${DO_SPACES_CDN_ENDPOINT}/${DO_SPACES_FOLDER}/${subFolder}/${fileName}`;

    // Proxy the file with Content-Disposition: attachment to force download
    const fileResponse = await fetch(cdnUrl);
    if (!fileResponse.ok) {
      console.error(`[Download] CDN fetch failed: ${fileResponse.status} for ${cdnUrl}`);
      return NextResponse.json(
        { error: "File not found on CDN" },
        { status: 404 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const contentType = fileResponse.headers.get("content-type") || "application/octet-stream";
    const safeFileName = fileName.split("/").pop() || fileName;

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Content-Length": String(fileBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error("[Download] Error:", error);
    return NextResponse.json(
      { error: "Error processing download" },
      { status: 500 }
    );
  }
}
