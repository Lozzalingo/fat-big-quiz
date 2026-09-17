// Cloud storage utility - Fat Big Quiz
// Uses centralised Storage service via StorageClient.
// Replaces direct @aws-sdk/client-s3 / DigitalOcean Spaces calls.

const { StorageClient } = require('../lib/storage-client');
const path = require('path');

const storage = new StorageClient();

const FOLDER = process.env.DO_SPACES_FOLDER || 'fat-big-quiz';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT;

/**
 * Upload a file to the centralised Storage service.
 * @param {Buffer} fileBuffer - The file data as a buffer
 * @param {string} fileName - Original filename
 * @param {string} subFolder - Subfolder within the project (e.g., 'products/images', 'downloads')
 * @param {string} contentType - MIME type of the file (passed for compatibility, service detects automatically)
 * @returns {Promise<{key: string, fileName: string, url: string, cdnUrl: string}>}
 */
async function uploadToSpaces(fileBuffer, fileName, subFolder, contentType) {
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueFileName = `${sanitizedBaseName}_${timestamp}${ext}`;

  console.log(`[Storage] Uploading ${uniqueFileName} to ${subFolder}`);

  const result = await storage.upload(fileBuffer, uniqueFileName, {
    siteId: 'fat-big-quiz',
    subfolder: subFolder,
    processImage: false, // Site handles its own processing
  });

  if (!result) {
    throw new Error('Upload to storage service failed');
  }

  // Build compatible key path for backwards compat
  const key = `${FOLDER}/${subFolder}/${uniqueFileName}`;

  return {
    key,
    fileName: uniqueFileName,
    url: result.cdnUrl,
    cdnUrl: result.cdnUrl,
  };
}

/**
 * Delete a file from the centralised Storage service.
 * @param {string} key - The full key path of the file to delete
 */
async function deleteFromSpaces(key) {
  console.log(`[Storage] Deleting: ${key}`);
  await storage.delete(key);
}

/**
 * Get a file from the centralised Storage service as a signed URL.
 * @param {string} key - The full key path of the file
 * @returns {Promise<{Body: ReadableStream, ContentType: string}>}
 */
async function getFromSpaces(key) {
  console.log(`[Storage] Fetching: ${key}`);
  // Get a short-lived signed URL and fetch the file
  const signed = await storage.getSignedUrl(key, 300);
  if (!signed || !signed.url) {
    throw new Error(`Failed to get signed URL for: ${key}`);
  }
  const response = await fetch(signed.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status}`);
  }
  return {
    Body: response.body,
    ContentType: response.headers.get('content-type') || 'application/octet-stream',
  };
}

/**
 * Convert a stored filename/key to a CDN URL.
 * @param {string} fileNameOrKey - Either just a filename or full key
 * @param {string} subFolder - The subfolder if only filename provided
 * @returns {string} The CDN URL
 */
function getCdnUrl(fileNameOrKey, subFolder = '') {
  // If it's already a full URL, return as-is
  if (fileNameOrKey.startsWith('http')) {
    return fileNameOrKey;
  }

  // If it's a full key (contains the folder path), use it directly
  if (fileNameOrKey.includes('/')) {
    return `${CDN_ENDPOINT}/${fileNameOrKey}`;
  }

  // Otherwise, construct the key from filename and subfolder
  const key = `${FOLDER}/${subFolder}/${fileNameOrKey}`;
  return `${CDN_ENDPOINT}/${key}`;
}

/**
 * Get the full key path for a file.
 * @param {string} fileName - The filename
 * @param {string} subFolder - The subfolder
 * @returns {string} The full key path
 */
function getKey(fileName, subFolder) {
  return `${FOLDER}/${subFolder}/${fileName}`;
}

module.exports = {
  uploadToSpaces,
  deleteFromSpaces,
  getFromSpaces,
  getCdnUrl,
  getKey,
  storage,
  FOLDER,
};
