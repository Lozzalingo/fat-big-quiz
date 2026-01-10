const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

// Path to service account key file
const KEY_FILE_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
  path.join(__dirname, "../config/google-service-account.json");

// Initialize the Indexing API client
let indexingClient = null;

const getIndexingClient = async () => {
  if (indexingClient) return indexingClient;

  // Check if key file exists
  if (!fs.existsSync(KEY_FILE_PATH)) {
    throw new Error(`Google service account key not found at: ${KEY_FILE_PATH}`);
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ["https://www.googleapis.com/auth/indexing"],
  });

  const authClient = await auth.getClient();
  indexingClient = google.indexing({ version: "v3", auth: authClient });

  return indexingClient;
};

/**
 * Submit a URL for indexing
 * @param {string} url - The full URL to index
 * @param {string} type - "URL_UPDATED" or "URL_DELETED"
 * @returns {Promise<object>} - Google API response
 */
const submitUrl = async (url, type = "URL_UPDATED") => {
  try {
    const client = await getIndexingClient();

    const response = await client.urlNotifications.publish({
      requestBody: {
        url: url,
        type: type, // URL_UPDATED or URL_DELETED
      },
    });

    console.log(`[Google Indexing] ${type}: ${url}`, response.data);
    return {
      success: true,
      url,
      type,
      response: response.data,
    };
  } catch (error) {
    console.error(`[Google Indexing] Error submitting ${url}:`, error.message);
    return {
      success: false,
      url,
      type,
      error: error.message,
    };
  }
};

/**
 * Submit multiple URLs for indexing
 * @param {string[]} urls - Array of URLs to index
 * @param {string} type - "URL_UPDATED" or "URL_DELETED"
 * @returns {Promise<object[]>} - Array of results
 */
const submitUrls = async (urls, type = "URL_UPDATED") => {
  const results = [];

  // Google has a rate limit of ~200 requests per day
  // Process sequentially with a small delay to be safe
  for (const url of urls) {
    const result = await submitUrl(url, type);
    results.push(result);

    // Small delay between requests (100ms)
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
};

/**
 * Get the status of a URL in the index
 * @param {string} url - The URL to check
 * @returns {Promise<object>} - Metadata about the URL
 */
const getUrlStatus = async (url) => {
  try {
    const client = await getIndexingClient();

    const response = await client.urlNotifications.getMetadata({
      url: url,
    });

    return {
      success: true,
      url,
      metadata: response.data,
    };
  } catch (error) {
    return {
      success: false,
      url,
      error: error.message,
    };
  }
};

/**
 * Check if service account is configured
 * @returns {boolean}
 */
const isConfigured = () => {
  return fs.existsSync(KEY_FILE_PATH);
};

/**
 * Get all indexable URLs from the site
 * @param {object} prisma - Prisma client instance
 * @returns {Promise<string[]>} - Array of URLs
 */
const getAllSiteUrls = async (prisma) => {
  const baseUrl = process.env.SITE_URL || "https://fatbigquiz.com";
  const urls = [];

  // Static pages
  const staticPages = [
    "",
    "/shop",
    "/blog",
    "/on-stage",
    "/weekly-pack",
    "/quiz-database",
  ];

  staticPages.forEach(page => {
    urls.push(`${baseUrl}${page}`);
  });

  // Product pages
  try {
    const products = await prisma.product.findMany({
      where: { published: true },
      select: { slug: true },
    });

    products.forEach(product => {
      urls.push(`${baseUrl}/product/${product.slug}`);
    });
  } catch (error) {
    console.error("Error fetching products for indexing:", error.message);
  }

  // Blog posts
  try {
    const posts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true },
    });

    posts.forEach(post => {
      urls.push(`${baseUrl}/blog/${post.slug}`);
    });
  } catch (error) {
    console.error("Error fetching blog posts for indexing:", error.message);
  }

  return urls;
};

module.exports = {
  submitUrl,
  submitUrls,
  getUrlStatus,
  isConfigured,
  getAllSiteUrls,
};
