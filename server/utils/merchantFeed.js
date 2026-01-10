/**
 * Google Merchant Feed Formatter
 * Converts database products to Google Merchant Center format
 * Supports multi-currency for global sales
 *
 * =============================================================================
 * HOW THIS WORKS
 * =============================================================================
 *
 * TARGET_MARKETS (57 countries):
 * - All countries where we sell, EXCEPT South Korea
 * - These countries accept GBP pricing with Google's auto currency conversion
 * - Main products target these countries with GBP price + GBP shipping
 *
 * SOUTH KOREA (handled separately):
 * - Korea requires native KRW (Korean Won) pricing
 * - Cannot use GBP with auto-conversion like other countries
 * - We create separate "-KR" product variants with KRW pricing
 * - Exchange rate: ~1700 KRW per 1 GBP
 *
 * PRODUCT OUTPUT:
 * formatProductsForMerchant() returns 2 entries per product:
 *   1. Main product: { offerId: "abc123", price: £1.99 GBP, shipping: 57 countries }
 *   2. KR variant:   { offerId: "abc123-KR", price: ₩3400 KRW, shipping: KR only }
 *
 * DIGITAL DOWNLOADS:
 * - All products are digital downloads (PDF quiz packs)
 * - Shipping is FREE and INSTANT for all countries
 * - No physical delivery, just download link after purchase
 *
 * ADDING NEW COUNTRIES:
 * - If country supports GBP auto-conversion: Add to TARGET_MARKETS
 * - If country requires local currency: Add to LOCAL_CURRENCY_MARKETS with rate
 *   and create a new data source in merchantApi.js (like we did for KR)
 *
 * =============================================================================
 */

const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT ||
  "https://aitshirts-laurence-dot-computer.sfo3.cdn.digitaloceanspaces.com";
const FOLDER = process.env.DO_SPACES_FOLDER || "fat-big-quiz";
const SITE_URL = process.env.FRONTEND_URL || "https://fatbigquiz.com";

// All Google Shopping countries with their currencies
const TARGET_MARKETS = [
  // English-speaking
  { country: "GB", currency: "GBP" },
  { country: "US", currency: "USD" },
  { country: "CA", currency: "CAD" },
  { country: "AU", currency: "AUD" },
  { country: "NZ", currency: "NZD" },
  { country: "IE", currency: "EUR" },
  { country: "ZA", currency: "ZAR" },
  { country: "SG", currency: "SGD" },
  { country: "HK", currency: "HKD" },
  { country: "PH", currency: "PHP" },
  { country: "MY", currency: "MYR" },
  { country: "IN", currency: "INR" },
  // Europe
  { country: "DE", currency: "EUR" },
  { country: "FR", currency: "EUR" },
  { country: "IT", currency: "EUR" },
  { country: "ES", currency: "EUR" },
  { country: "NL", currency: "EUR" },
  { country: "BE", currency: "EUR" },
  { country: "AT", currency: "EUR" },
  { country: "PT", currency: "EUR" },
  { country: "FI", currency: "EUR" },
  { country: "GR", currency: "EUR" },
  { country: "SK", currency: "EUR" },
  { country: "SI", currency: "EUR" },
  { country: "EE", currency: "EUR" },
  { country: "LV", currency: "EUR" },
  { country: "LT", currency: "EUR" },
  { country: "LU", currency: "EUR" },
  { country: "MT", currency: "EUR" },
  { country: "CY", currency: "EUR" },
  { country: "SE", currency: "SEK" },
  { country: "DK", currency: "DKK" },
  { country: "NO", currency: "NOK" },
  { country: "PL", currency: "PLN" },
  { country: "CZ", currency: "CZK" },
  { country: "HU", currency: "HUF" },
  { country: "RO", currency: "RON" },
  { country: "BG", currency: "BGN" },
  { country: "HR", currency: "EUR" },
  { country: "CH", currency: "CHF" },
  // Americas
  { country: "MX", currency: "MXN" },
  { country: "BR", currency: "BRL" },
  { country: "AR", currency: "ARS" },
  { country: "CL", currency: "CLP" },
  { country: "CO", currency: "COP" },
  { country: "PE", currency: "PEN" },
  // Asia Pacific
  { country: "JP", currency: "JPY" },
  // KR handled separately with dedicated data source
  { country: "TW", currency: "TWD" },
  { country: "TH", currency: "THB" },
  { country: "VN", currency: "VND" },
  { country: "ID", currency: "IDR" },
  // Middle East
  { country: "AE", currency: "AED" },
  { country: "SA", currency: "SAR" },
  { country: "IL", currency: "ILS" },
  { country: "TR", currency: "TRY" },
  // Other
  { country: "RU", currency: "RUB" },
  { country: "UA", currency: "UAH" },
];

/**
 * Get product image URL from CDN
 */
function getProductImageUrl(filename, productSlug) {
  if (!filename) return null;
  if (filename.startsWith("http")) return filename;

  // All product images are stored in the flat /products/images/ structure
  return `${CDN_ENDPOINT}/${FOLDER}/products/images/${filename}`;
}

/**
 * Convert a database product to Google Merchant format
 * @see https://developers.google.com/shopping-content/reference/rest/v2.1/products
 */
function formatProductForMerchant(product) {
  // Skip products that shouldn't be in Google Shopping
  if (!product.inStock && product.inStock !== 1) {
    // Out of stock items can still be listed with availability: out_of_stock
  }

  // Determine availability
  const availability = product.inStock >= 1 ? "in_stock" : "out_of_stock";

  // Get main image URL
  const imageUrl = getProductImageUrl(product.mainImage, product.slug);

  // Get additional images
  const additionalImages = [];
  if (product.images && product.images.length > 0) {
    product.images.forEach(img => {
      const url = getProductImageUrl(img.image, product.slug);
      if (url && !additionalImages.includes(url)) {
        additionalImages.push(url);
      }
    });
  }

  // Build category path for Google
  // Digital downloads fall under: Media > Books > E-books or similar
  // Quiz packs could be: Arts & Entertainment > Party & Celebration > Party Games
  let googleProductCategory = "Arts & Entertainment > Party & Celebration > Party Supplies";

  // Get our category names for the product type
  const categoryNames = [];
  if (product.category) {
    categoryNames.push(product.category.name);
  }
  if (product.categories && product.categories.length > 0) {
    product.categories.forEach(pc => {
      if (pc.category && !categoryNames.includes(pc.category.name)) {
        categoryNames.push(pc.category.name);
      }
    });
  }

  // Build description - strip HTML if present
  let description = product.description || "";
  description = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  // Google allows max 5000 characters
  if (description.length > 5000) {
    description = description.substring(0, 4997) + "...";
  }

  // Title - max 150 characters
  let title = product.title || "";
  if (title.length > 150) {
    title = title.substring(0, 147) + "...";
  }

  // Build the product data object
  const merchantProduct = {
    // Required fields
    offerId: product.id, // Your internal product ID
    title: title,
    description: description,
    link: `${SITE_URL}/product/${product.slug}`,
    imageLink: imageUrl,
    availability: availability,
    price: {
      value: product.price.toFixed(2),
      currency: "GBP",
    },

    // Recommended fields
    brand: "Fat Big Quiz",
    condition: "new",
    contentLanguage: "en",
    targetCountry: "GB",
    channel: "online",

    // Free instant delivery for digital downloads (all target markets in GBP)
    shipping: TARGET_MARKETS.map(market => ({
      country: market.country,
      service: "Digital Download - Instant Delivery",
      price: {
        value: "0",
        currency: "GBP",
      },
    })),

    // Category
    googleProductCategory: googleProductCategory,
    productTypes: categoryNames.length > 0 ? categoryNames : ["Quiz Packs"],

    // Digital product specific
    // Google doesn't have a "digital download" type, but we can indicate it's not physical
    isBundle: false,
  };

  // Add additional images if available (max 10)
  if (additionalImages.length > 0) {
    merchantProduct.additionalImageLinks = additionalImages.slice(0, 10);
  }

  // Add quiz format as custom label for filtering in Google Ads
  if (product.quizFormat) {
    merchantProduct.customLabel0 = product.quizFormat.displayName || product.quizFormat.name;
  }

  // Add product type as custom label
  if (product.productType) {
    merchantProduct.customLabel1 = product.productType;
  }

  // Add sale price if there's a discount (future enhancement)
  // merchantProduct.salePrice = { value: "X.XX", currency: "GBP" };

  // Identifiers - digital products often don't have GTINs/MPNs
  // Setting identifierExists to false tells Google this is expected
  merchantProduct.identifierExists = false;

  return merchantProduct;
}

// South Korea needs separate data source with KRW
const SOUTH_KOREA = { country: "KR", currency: "KRW", rate: 1700, feedLabel: "KR" };

// Markets requiring explicit local currency (no auto-conversion from GBP)
const LOCAL_CURRENCY_MARKETS = [SOUTH_KOREA];

/**
 * Format multiple products for batch upload
 * Creates regional variants for markets requiring local currency
 */
function formatProductsForMerchant(products) {
  const result = [];

  for (const product of products.filter(p => p.price > 0)) {
    // Main product entry (GBP for most markets)
    result.push(formatProductForMerchant(product));

    // Create regional variants for markets requiring local currency + separate data source
    for (const market of LOCAL_CURRENCY_MARKETS) {
      const localPrice = (product.price * market.rate).toFixed(0);
      const regionalProduct = {
        ...formatProductForMerchant(product),
        offerId: `${product.id}-${market.country}`,
        feedLabel: market.feedLabel, // Uses separate data source
        targetCountry: market.country,
        price: {
          value: localPrice,
          currency: market.currency,
        },
        // Shipping in local currency for this market only
        shipping: [{
          country: market.country,
          service: "Digital Download - Instant Delivery",
          price: {
            value: "0",
            currency: market.currency,
          },
        }],
      };
      result.push(regionalProduct);
    }
  }

  return result;
}

/**
 * Validate a product for Merchant Center requirements
 */
function validateProduct(product) {
  const errors = [];

  if (!product.title || product.title.trim().length === 0) {
    errors.push("Title is required");
  }
  if (!product.description || product.description.trim().length === 0) {
    errors.push("Description is required");
  }
  if (!product.mainImage) {
    errors.push("Main image is required");
  }
  if (!product.price || product.price <= 0) {
    errors.push("Price must be greater than 0");
  }
  if (!product.slug) {
    errors.push("Product slug is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  formatProductForMerchant,
  formatProductsForMerchant,
  validateProduct,
  getProductImageUrl,
  TARGET_MARKETS,
};
