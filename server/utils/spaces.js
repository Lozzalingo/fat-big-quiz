// DigitalOcean Spaces (S3-compatible) utility
const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
});

const BUCKET = process.env.DO_SPACES_BUCKET;
const FOLDER = process.env.DO_SPACES_FOLDER || 'fat-big-quiz';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT;

/**
 * Upload a file to DigitalOcean Spaces
 * @param {Buffer} fileBuffer - The file data as a buffer
 * @param {string} fileName - Original filename
 * @param {string} subFolder - Subfolder within the project (e.g., 'products/images', 'downloads', 'blog', 'blog/content', 'users/avatars')
 * @param {string} contentType - MIME type of the file
 * @returns {Promise<{key: string, url: string, cdnUrl: string}>}
 */
async function uploadToSpaces(fileBuffer, fileName, subFolder, contentType) {
  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
  const uniqueFileName = `${sanitizedBaseName}_${timestamp}${ext}`;

  // Construct the full key path
  const key = `${FOLDER}/${subFolder}/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
    ACL: 'public-read', // Make file publicly accessible
  });

  await s3Client.send(command);

  // Return both the key and public URLs
  const url = `${process.env.DO_SPACES_ENDPOINT}/${BUCKET}/${key}`;
  const cdnUrl = `${CDN_ENDPOINT}/${key}`;

  return {
    key,
    fileName: uniqueFileName,
    url,
    cdnUrl,
  };
}

/**
 * Delete a file from DigitalOcean Spaces
 * @param {string} key - The full key path of the file to delete
 */
async function deleteFromSpaces(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Get a file from DigitalOcean Spaces
 * @param {string} key - The full key path of the file
 * @returns {Promise<{Body: ReadableStream, ContentType: string}>}
 */
async function getFromSpaces(key) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return await s3Client.send(command);
}

/**
 * Convert a stored filename/key to a CDN URL
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
 * Get the full key path for a file
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
  s3Client,
  BUCKET,
  FOLDER,
};
