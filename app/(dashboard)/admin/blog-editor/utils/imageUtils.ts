// Check if URL is from our CDN or legacy local server
const isBlogContentImage = (src: string): boolean => {
  // CDN URLs
  if (src.includes("digitaloceanspaces.com") && src.includes("/blog/content/")) {
    return true;
  }
  // Legacy local server URLs
  if (src.includes("/server/images/blog-body/")) {
    return true;
  }
  return false;
};

export const extractImageUrls = (htmlContent: string): string[] => {
    if (!htmlContent) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const images = Array.from(doc.querySelectorAll("img"));
    return images
      .map((img) => img.src)
      .filter((src) => isBlogContentImage(src));
  };

  export const getFilenameFromUrl = (url: string): string | null => {
    try {
      const urlPath = url.split("/").pop();
      if (!urlPath) return null;
      return decodeURIComponent(urlPath);
    } catch (error) {
      console.error("Error extracting filename from URL:", error);
      return null;
    }
  };

  export const getFolderFromUrl = (url: string): string | null => {
    try {
      // CDN URLs
      if (url.includes("digitaloceanspaces.com") && url.includes("/blog/content/")) {
        return "blog/content";
      }
      // Legacy local server URLs
      if (url.includes("/server/images/blog-body/")) {
        return "blog-body";
      }
      return null;
    } catch (error) {
      console.error("Error extracting folder from URL:", error);
      return null;
    }
  };

  export const deleteUnusedImages = async (imagesToDelete: string[]): Promise<void> => {
    const deletionPromises = imagesToDelete.map(async (imageUrl) => {
      try {
        const filename = getFilenameFromUrl(imageUrl);
        const folderName = getFolderFromUrl(imageUrl);
        if (!filename || !folderName) return;
        // Only delete blog content images, not product images
        if (folderName !== "blog/content" && folderName !== "blog-body") {
          console.log(`Skipping deletion of non-blog-content image: ${filename}`);
          return;
        }
        console.log(`Deleting unused image: ${filename} from ${folderName}`);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/backendimages`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, folderName }),
        });
        if (!response.ok) {
          console.error(`Failed to delete image ${filename}:`, await response.text());
        } else {
          console.log(`Successfully deleted image: ${filename}`);
        }
      } catch (error) {
        console.error("Error during image deletion:", error);
      }
    });
    await Promise.all(deletionPromises);
  };