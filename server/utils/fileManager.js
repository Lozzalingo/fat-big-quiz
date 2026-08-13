const { deleteFromSpaces, getKey } = require("./spaces");

/**
 * Delete a file from DO Spaces, logging success/failure.
 * @param {string} filename - the filename or full URL
 * @param {string} folder - the Spaces folder (e.g. "products", "homepage-cards")
 * @param {string} moduleName - for logging prefix (e.g. "Products")
 */
async function deleteSpacesFile(filename, folder, moduleName = "FileManager") {
  if (!filename) return;
  try {
    const key = getKey(filename, folder);
    await deleteFromSpaces(key);
    console.log(`[${moduleName}] Deleted file from Spaces: ${key}`);
  } catch (err) {
    console.error(`[${moduleName}] Failed to delete file from Spaces:`, err.message);
  }
}

module.exports = { deleteSpacesFile };
