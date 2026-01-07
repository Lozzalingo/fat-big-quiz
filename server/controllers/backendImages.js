// controllers/backendImages.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require('path');
const { uploadToSpaces, deleteFromSpaces, getKey, getCdnUrl } = require('../utils/spaces');

// MIME type mapping
const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
};

async function uploadImage(req, res) {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ error: "No files were uploaded" });
    }

    const uploadedFile = req.files.uploadedFile;
    const oldImage = req.body.oldImage;
    const folderName = req.body.folderName;

    // Validate folderName
    if (!folderName) {
      return res.status(400).json({ error: "Folder name must be provided" });
    }

    // Sanitize folderName - allow nested paths like "products/images"
    // Remove any path traversal attempts but keep forward slashes for nested folders
    const sanitizedFolderName = folderName
      .replace(/\.\./g, '')  // Remove path traversal
      .replace(/^\/+|\/+$/g, '')  // Remove leading/trailing slashes
      .replace(/\/+/g, '/');  // Normalize multiple slashes

    // Determine content type
    const ext = path.extname(uploadedFile.name).toLowerCase();
    const contentType = mimeTypes[ext] || uploadedFile.mimetype || 'application/octet-stream';

    // If oldImage exists, try to delete it from Spaces
    if (oldImage) {
      try {
        const oldKey = getKey(oldImage, sanitizedFolderName);
        await deleteFromSpaces(oldKey);
        console.log(`Deleted old image from Spaces: ${oldKey}`);
      } catch (err) {
        // Log but don't fail - old image might not exist
        console.error(`Error deleting old image from Spaces: ${err.message}`);
      }
    }

    // Upload to DigitalOcean Spaces
    const result = await uploadToSpaces(
      uploadedFile.data,
      uploadedFile.name,
      sanitizedFolderName,
      contentType
    );

    console.log(`Uploaded to Spaces: ${result.cdnUrl}`);

    res.status(200).json({
      message: "File uploaded successfully",
      filename: result.fileName,
      key: result.key,
      url: result.url,
      cdnUrl: result.cdnUrl,
    });
  } catch (error) {
    console.error(`Upload error: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

async function deleteImage(req, res) {
  try {
    const { filename, folderName } = req.body;

    // Validate required fields
    if (!filename || !folderName) {
      return res.status(400).json({ error: "Filename and folder name must be provided" });
    }

    // Sanitize folderName and filename
    const sanitizedFolderName = path.basename(folderName);
    const sanitizedFilename = path.basename(filename);

    // Delete from Spaces
    const key = getKey(sanitizedFilename, sanitizedFolderName);
    await deleteFromSpaces(key);

    res.status(200).json({
      message: "Image deleted successfully",
      filename: sanitizedFilename
    });
  } catch (error) {
    console.error(`Delete error: ${error}`);
    res.status(500).json({ error: "Server error", details: error.message });
  }
}

module.exports = {
  uploadImage,
  deleteImage
};
