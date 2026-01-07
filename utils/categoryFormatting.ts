// helper function for converting URL category name to friendly and more readable name
// For example "smart-watches" after this function will be "smart watches"
const formatCategoryName = (categoryName: string) => {
  const categoryNameArray = categoryName.split("-");
  return categoryNameArray.join(" ");
};

// helper function for converting category name to URL category name
// For example "smart watches" after this function will be "smart-watches"
const convertCategoryNameToURLFriendly = (categoryName: string) => {
  if (!categoryName) return "";
  return categoryName
    .toLowerCase() // Convert to lowercase
    .replace(/['"]/g, "") // Remove single and double quotes
    .replace(/[^a-z0-9\s-]/g, "") // Remove all non-alphanumeric characters except spaces and hyphens
    .trim() // Remove leading/trailing spaces
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with a single hyphen
};

export { formatCategoryName, convertCategoryNameToURLFriendly };
