/**
 * Shared Prisma include/select objects to avoid repetition across controllers.
 */

/**
 * Standard include for a product with its legacy category, quiz format, and categories.
 * Used in createProduct, updateProduct, duplicateProduct, reorderProducts, getVariantsByParent.
 */
const PRODUCT_INCLUDES = {
  legacyCategory: { select: { name: true } },
  quizFormat: { select: { id: true, name: true, displayName: true } },
  categories: {
    include: { category: { select: { id: true, name: true } } },
  },
};

/**
 * Standard include for a blog post list item (author, category, tags - no comments).
 * Used in getAllBlogPosts, createBlogPost, updateBlogPost, searchBlogPosts.
 */
const BLOG_POST_LIST_INCLUDES = {
  author: {
    select: {
      firstName: true,
      name: true,
    },
  },
  category: {
    select: {
      name: true,
    },
  },
  tags: {
    select: {
      name: true,
    },
  },
};

/**
 * Standard select for a discount code record.
 * Used in getAllDiscountCodes, getDiscountCodeById, createDiscountCode, updateDiscountCode.
 */
const DISCOUNT_CODE_SELECT = {
  id: true,
  code: true,
  discountType: true,
  discountValue: true,
  startDate: true,
  endDate: true,
  minPurchase: true,
  maxRedemptions: true,
  currentRedemptions: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

module.exports = {
  PRODUCT_INCLUDES,
  BLOG_POST_LIST_INCLUDES,
  DISCOUNT_CODE_SELECT,
};
