// CDN URL utilities for DigitalOcean Spaces

const CDN_ENDPOINT = process.env.NEXT_PUBLIC_DO_SPACES_CDN_ENDPOINT ||
  "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com";
const FOLDER = process.env.NEXT_PUBLIC_DO_SPACES_FOLDER || "fat-big-quiz";

// Folder structure:
// fat-big-quiz/
// ├── avatars/                 # User profile pictures
// ├── blog/                    # Blog cover images
// │   └── content/             # Inline blog content images
// ├── categories/              # Category cover images
// ├── downloads/               # Downloadable files
// ├── products/
// │   └── [product-slug]/      # Product-specific folder (images + PDFs)
// └── quiz-formats/
//     └── explainers/          # Quiz format explainer images

/**
 * Get the CDN URL for an image
 * Handles both new CDN paths and legacy local paths
 */
export function getImageUrl(filename: string | null | undefined, subFolder: string): string {
  if (!filename) {
    return "/product_placeholder.jpg";
  }

  // If it's already a full URL, return as-is
  if (filename.startsWith("http")) {
    return filename;
  }

  // Use CDN for new uploads
  return `${CDN_ENDPOINT}/${FOLDER}/${subFolder}/${filename}`;
}

/**
 * Get product image URL (legacy - flat structure)
 * @deprecated Use getProductFileUrl with product slug instead
 */
export function getProductImageUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "products/images");
}

/**
 * Get product file URL with slug-based folder structure
 * New structure: products/[product-slug]/[filename]
 */
export function getProductFileUrl(filename: string | null | undefined, productSlug: string): string {
  if (!filename) {
    return "/product_placeholder.jpg";
  }
  if (filename.startsWith("http")) {
    return filename;
  }
  return `${CDN_ENDPOINT}/${FOLDER}/products/${productSlug}/${filename}`;
}

/**
 * Get quiz format explainer image URL
 */
export function getQuizFormatExplainerUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "quiz-formats/explainers");
}

/**
 * Get homepage card image URL
 */
export function getHomepageCardImageUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "homepage-cards");
}

/**
 * Get blog header image URL
 */
export function getBlogImageUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "blog");
}

/**
 * Get download file URL (for direct CDN access)
 */
export function getDownloadUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "downloads");
}

/**
 * Get user avatar URL
 */
export function getUserAvatarUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "avatars");
}

/**
 * Get blog content image URL (for inline images in blog posts)
 */
export function getBlogContentImageUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "blog/content");
}

/**
 * Get category cover image URL
 */
export function getCategoryImageUrl(filename: string | null | undefined): string {
  return getImageUrl(filename, "categories");
}

/**
 * Check if a URL is a CDN URL
 */
export function isCdnUrl(url: string): boolean {
  return url.includes("digitaloceanspaces.com") || url.includes("cdn.digitaloceanspaces.com");
}
