/**
 * Google Merchant API Service (New 2025 API)
 * Syncs products to Google Merchant Center for Shopping listings
 *
 * Uses the new Merchant API which replaced Content API for Shopping
 * @see https://developers.google.com/merchant/api
 *
 * =============================================================================
 * MULTI-CURRENCY GLOBAL SALES ARCHITECTURE
 * =============================================================================
 *
 * Google Merchant Center requires:
 * 1. All prices in a single product must use the same currency
 * 2. Some countries (like South Korea) don't support automatic currency conversion
 *
 * Our solution uses TWO data sources:
 *
 * PRIMARY DATA SOURCE (57 countries):
 * - feedLabel: "FATBIGQUIZ-DOWNLOADS"
 * - Currency: GBP (British Pounds)
 * - Targets: GB, US, CA, AU, EU countries, etc. (all except South Korea)
 * - Google automatically converts GBP to local currencies for display
 *
 * SOUTH KOREA DATA SOURCE:
 * - feedLabel: "KR"
 * - Currency: KRW (Korean Won)
 * - Targets: South Korea only
 * - Required because Korea doesn't accept GBP with auto-conversion
 *
 * PRODUCT SUBMISSION:
 * - Each product is submitted TWICE:
 *   1. Main product (ID: xxx) → Primary data source, GBP pricing
 *   2. KR variant (ID: xxx-KR) → KR data source, KRW pricing (~1700x GBP)
 *
 * SHIPPING:
 * - Main products: Free GBP shipping to all 57 countries
 * - KR variants: Free KRW shipping to South Korea only
 *
 * WHY THIS COMPLEXITY?
 * - Google requires shipping currency to match product currency
 * - Mixing currencies (GBP price + KRW shipping) causes "Inconsistent currencies" error
 * - Separate data sources allow different currency rules per region
 *
 * =============================================================================
 */

const { ProductInputsServiceClient } = require("@google-shopping/products").v1beta;
const { DataSourcesServiceClient } = require("@google-shopping/datasources").v1beta;
const { google } = require("googleapis");
const { TARGET_MARKETS } = require("../utils/merchantFeed");

const MERCHANT_ID = process.env.GOOGLE_MERCHANT_ID;
const TARGET_COUNTRIES = TARGET_MARKETS.map(m => m.country);
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

let productInputsClient = null;
let dataSourcesClient = null;
let contentApiClient = null;

// Data sources by feedLabel
const dataSources = {
  primary: { name: null, feedLabel: null, contentLanguage: null },
  KR: { name: null, feedLabel: "KR", contentLanguage: "ko" },
};

// Legacy references for backwards compatibility
let primaryDataSourceName = null;
let dataSourceFeedLabel = null;
let dataSourceContentLanguage = null;

/**
 * Initialize the Merchant API clients
 */
async function initClient() {
  if (productInputsClient) return productInputsClient;

  if (!MERCHANT_ID) {
    throw new Error("GOOGLE_MERCHANT_ID not configured");
  }

  if (!CREDENTIALS_PATH) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS not configured");
  }

  try {
    const clientOptions = {
      keyFilename: CREDENTIALS_PATH,
    };

    productInputsClient = new ProductInputsServiceClient(clientOptions);
    dataSourcesClient = new DataSourcesServiceClient(clientOptions);

    // Find or create primary data source (for most countries)
    primaryDataSourceName = await getOrCreatePrimaryDataSource();

    // Find or create KR data source (South Korea with KRW)
    await getOrCreateKRDataSource();

    console.log("[MerchantAPI] Client initialized successfully");
    console.log("[MerchantAPI] Primary data source:", primaryDataSourceName);
    console.log("[MerchantAPI] KR data source:", dataSources.KR.name);
    return productInputsClient;
  } catch (error) {
    console.error("[MerchantAPI] Failed to initialize client:", error.message);
    throw error;
  }
}

/**
 * Get or create the primary data source for products
 * Ensures data source targets only GB for GBP currency
 */
async function getOrCreatePrimaryDataSource() {
  const parent = `accounts/${MERCHANT_ID}`;

  try {
    // List existing data sources
    const [dataSources] = await dataSourcesClient.listDataSources({ parent });

    // Look for existing primary product data source
    for (const ds of dataSources) {
      if (ds.primaryProductDataSource) {
        console.log("[MerchantAPI] Found existing primary data source:", ds.name);
        const pds = ds.primaryProductDataSource;

        // Check if data source countries match TARGET_COUNTRIES exactly
        const countries = pds.countries || [];
        const missingCountries = TARGET_COUNTRIES.filter(c => !countries.includes(c));
        const extraCountries = countries.filter(c => !TARGET_COUNTRIES.includes(c));

        if (missingCountries.length > 0 || extraCountries.length > 0) {
          if (missingCountries.length > 0) {
            console.log(`[MerchantAPI] Data source missing countries: ${missingCountries.join(", ")}`);
          }
          if (extraCountries.length > 0) {
            console.log(`[MerchantAPI] Data source has extra countries to remove: ${extraCountries.join(", ")}`);
          }
          console.log(`[MerchantAPI] Updating to target exactly: ${TARGET_COUNTRIES.join(", ")}`);

          // Update the data source to target exactly TARGET_COUNTRIES
          try {
            await dataSourcesClient.updateDataSource({
              dataSource: {
                name: ds.name,
                displayName: ds.displayName || "Fat Big Quiz Products - Global",
                primaryProductDataSource: {
                  channel: pds.channel || "ONLINE_PRODUCTS",
                  contentLanguage: pds.contentLanguage || "en",
                  feedLabel: pds.feedLabel,
                  countries: TARGET_COUNTRIES,
                },
              },
              updateMask: {
                paths: ["primary_product_data_source.countries"],
              },
            });
            console.log(`[MerchantAPI] Updated data source to target ${TARGET_COUNTRIES.length} countries (removed KR)`);
          } catch (updateErr) {
            console.log("[MerchantAPI] Could not update countries (may need manual config):", updateErr.message);
          }
        } else {
          console.log(`[MerchantAPI] Data source already targets correct ${countries.length} countries`);
        }

        // Extract feedLabel and contentLanguage from existing data source
        dataSourceFeedLabel = pds.feedLabel || "GB";
        dataSourceContentLanguage = pds.contentLanguage || "en";
        console.log(`[MerchantAPI] Using feedLabel: ${dataSourceFeedLabel}, contentLanguage: ${dataSourceContentLanguage}`);
        return ds.name;
      }
    }

    // Create new primary data source if none exists
    console.log("[MerchantAPI] Creating new primary data source for global sales...");
    dataSourceFeedLabel = "GB";
    dataSourceContentLanguage = "en";

    const [newDataSource] = await dataSourcesClient.createDataSource({
      parent,
      dataSource: {
        displayName: "Fat Big Quiz Products - Global",
        primaryProductDataSource: {
          channel: "ONLINE_PRODUCTS",
          contentLanguage: dataSourceContentLanguage,
          feedLabel: dataSourceFeedLabel,
          countries: TARGET_COUNTRIES,
        },
      },
    });

    console.log("[MerchantAPI] Created data source:", newDataSource.name);
    return newDataSource.name;
  } catch (error) {
    console.error("[MerchantAPI] Error with data sources:", error.message);
    throw error;
  }
}

/**
 * Get or create data source for South Korea (KRW currency)
 */
async function getOrCreateKRDataSource() {
  const parent = `accounts/${MERCHANT_ID}`;

  try {
    // List existing data sources
    const [existingDataSources] = await dataSourcesClient.listDataSources({ parent });

    // Look for existing KR data source
    for (const ds of existingDataSources) {
      if (ds.primaryProductDataSource && ds.primaryProductDataSource.feedLabel === "KR") {
        console.log("[MerchantAPI] Found existing KR data source:", ds.name);
        dataSources.KR.name = ds.name;
        return ds.name;
      }
    }

    // Create new KR data source
    console.log("[MerchantAPI] Creating new KR data source...");
    const [newDataSource] = await dataSourcesClient.createDataSource({
      parent,
      dataSource: {
        displayName: "Fat Big Quiz Products - South Korea",
        primaryProductDataSource: {
          channel: "ONLINE_PRODUCTS",
          contentLanguage: "en",
          feedLabel: "KR",
          countries: ["KR"],
        },
      },
    });

    console.log("[MerchantAPI] Created KR data source:", newDataSource.name);
    dataSources.KR.name = newDataSource.name;
    return newDataSource.name;
  } catch (error) {
    console.error("[MerchantAPI] Error creating KR data source:", error.message);
    // Non-fatal - KR products will fail but main products will work
    return null;
  }
}

/**
 * Insert or update a product in Google Merchant Center
 */
async function upsertProduct(productData) {
  await initClient();

  try {
    const parent = `accounts/${MERCHANT_ID}`;

    const request = {
      parent,
      productInput: {
        name: `${parent}/productInputs/${productData.offerId}`,
        offerId: productData.offerId,
        contentLanguage: dataSourceContentLanguage || "en",
        // Use product's feedLabel for regional variants, otherwise use data source's
        feedLabel: productData.feedLabel || dataSourceFeedLabel || "GB",
        attributes: {
          title: productData.title,
          description: productData.description,
          link: productData.link,
          imageLink: productData.imageLink,
          availability: productData.availability,
          price: {
            amountMicros: Math.round(parseFloat(productData.price.value) * 1000000).toString(),
            currencyCode: productData.price.currency,
          },
          brand: productData.brand || "Fat Big Quiz",
          condition: productData.condition || "new",
          identifierExists: false,
          // Shipping - free instant delivery for digital downloads
          shipping: productData.shipping ? productData.shipping.map(s => ({
            country: s.country,
            service: s.service,
            price: {
              amountMicros: Math.round(parseFloat(s.price.value) * 1000000).toString(),
              currencyCode: s.price.currency,
            },
          })) : TARGET_MARKETS.map(m => ({
            country: m.country,
            service: "Digital Download - Instant Delivery",
            price: { amountMicros: "0", currencyCode: "GBP" },
          })),
          // Additional images
          additionalImageLinks: productData.additionalImageLinks || [],
          // Custom labels for Google Ads filtering
          customLabel0: productData.customLabel0,
          customLabel1: productData.customLabel1,
        },
      },
      // Use appropriate data source based on feedLabel
      dataSource: productData.feedLabel === "KR" ? dataSources.KR.name : primaryDataSourceName,
    };

    const [response] = await productInputsClient.insertProductInput(request);

    console.log(`[MerchantAPI] Product upserted: ${productData.offerId}`);
    return { success: true, data: response };
  } catch (error) {
    console.error(`[MerchantAPI] Failed to upsert product ${productData.offerId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a product from Google Merchant Center
 */
async function deleteProduct(productId) {
  await initClient();

  try {
    // Determine which data source to use based on product ID suffix
    const isKRProduct = productId.endsWith('-KR');
    const dataSourceName = isKRProduct ? dataSources.KR.name : primaryDataSourceName;

    const name = `accounts/${MERCHANT_ID}/productInputs/${productId}`;

    console.log(`[MerchantAPI] Deleting product: name=${name}, dataSource=${dataSourceName}`);

    await productInputsClient.deleteProductInput({
      name: name,
      dataSource: String(dataSourceName),
    });

    console.log(`[MerchantAPI] Product deleted: ${productId} (dataSource: ${isKRProduct ? 'KR' : 'primary'})`);
    return { success: true };
  } catch (error) {
    // NOT_FOUND is fine - product doesn't exist
    if (error.code === 5) {
      console.log(`[MerchantAPI] Product not found (already deleted): ${productId}`);
      return { success: true };
    }
    console.error(`[MerchantAPI] Failed to delete product ${productId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all KR variant products from Google Merchant Center
 * This removes products with -KR suffix from both data sources
 */
async function deleteAllKRProducts() {
  await initClient();

  const results = { deleted: 0, failed: 0, errors: [] };

  try {
    // List all products
    const listResult = await listProducts(500);
    if (!listResult.success) {
      return { success: false, error: listResult.error };
    }

    // Find all products with -KR in their offer ID
    const krProducts = listResult.data.filter(p => {
      const name = p.name || '';
      return name.includes('-KR');
    });

    console.log(`[MerchantAPI] Found ${krProducts.length} KR products to delete`);

    // Delete each KR product
    for (const product of krProducts) {
      try {
        // Extract offer ID and feed label from the product name
        // Format: accounts/xxx/products/online~en~FEEDLABEL~OFFERID
        const nameParts = product.name.split('/');
        const productPart = nameParts[nameParts.length - 1]; // online~en~FEEDLABEL~OFFERID
        const tildes = productPart.split('~');

        if (tildes.length >= 4) {
          const feedLabel = tildes[2];
          const offerId = tildes[3];

          // Determine which data source based on feed label
          const dataSourceName = feedLabel === 'KR' ? dataSources.KR.name : primaryDataSourceName;

          console.log(`[MerchantAPI] Deleting: offerId=${offerId}, feedLabel=${feedLabel}, dataSource=${dataSourceName}`);

          // Use explicit string conversion to avoid any encoding issues
          const request = {
            name: String(`accounts/${MERCHANT_ID}/productInputs/${offerId}`),
            dataSource: String(dataSourceName),
          };

          console.log(`[MerchantAPI] Request:`, JSON.stringify(request));

          await productInputsClient.deleteProductInput(request);

          results.deleted++;
          console.log(`[MerchantAPI] Successfully deleted: ${offerId}`);
        }
      } catch (err) {
        if (err.code === 5) {
          // NOT_FOUND is fine
          console.log(`[MerchantAPI] Product not found (already deleted): ${product.name}`);
          results.deleted++;
        } else {
          console.error(`[MerchantAPI] Delete error:`, err.message);
          results.failed++;
          results.errors.push({ product: product.name, error: err.message });
        }
      }
    }

    console.log(`[MerchantAPI] KR cleanup complete: ${results.deleted} deleted, ${results.failed} failed`);
    return { success: true, ...results };
  } catch (error) {
    console.error("[MerchantAPI] Error deleting KR products:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete ALL products from Google Merchant Center (gRPC - may have encoding issues)
 */
async function deleteAllProducts() {
  await initClient();

  const results = { deleted: 0, failed: 0, errors: [] };

  try {
    const listResult = await listProducts(500);
    if (!listResult.success) {
      return { success: false, error: listResult.error };
    }

    console.log(`[MerchantAPI] Found ${listResult.data.length} total products to delete`);

    for (const product of listResult.data) {
      try {
        const nameParts = product.name.split('/');
        const productPart = nameParts[nameParts.length - 1];
        const tildes = productPart.split('~');

        if (tildes.length >= 4) {
          const feedLabel = tildes[2];
          const offerId = tildes[3];
          const dataSourceName = feedLabel === 'KR' ? dataSources.KR.name : primaryDataSourceName;

          const request = {
            name: String(`accounts/${MERCHANT_ID}/productInputs/${offerId}`),
            dataSource: String(dataSourceName),
          };

          await productInputsClient.deleteProductInput(request);
          results.deleted++;
          console.log(`[MerchantAPI] Deleted: ${offerId}`);
        }
      } catch (err) {
        if (err.code === 5) {
          results.deleted++;
        } else {
          results.failed++;
          results.errors.push({ product: product.name, error: err.message });
        }
      }
    }

    return { success: true, ...results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Initialize Content API client (REST-based, no gRPC encoding issues)
 */
async function initContentApiClient() {
  if (contentApiClient) return contentApiClient;

  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ["https://www.googleapis.com/auth/content"],
  });

  contentApiClient = google.content({ version: "v2.1", auth });
  console.log("[MerchantAPI] Content API client initialized");
  return contentApiClient;
}

/**
 * Delete data sources (removes all products in them)
 * WARNING: This is destructive - will delete all products
 */
async function deleteDataSources() {
  await initClient();

  const results = { deleted: [], errors: [] };
  const parent = `accounts/${MERCHANT_ID}`;

  try {
    // List all data sources
    const [allDataSources] = await dataSourcesClient.listDataSources({ parent });

    console.log(`[MerchantAPI] Found ${allDataSources.length} data sources to delete`);

    for (const ds of allDataSources) {
      try {
        console.log(`[MerchantAPI] Deleting data source: ${ds.name} (${ds.displayName})`);
        await dataSourcesClient.deleteDataSource({ name: ds.name });
        results.deleted.push({ name: ds.name, displayName: ds.displayName });
        console.log(`[MerchantAPI] Successfully deleted: ${ds.displayName}`);
      } catch (err) {
        console.error(`[MerchantAPI] Failed to delete ${ds.name}:`, err.message);
        results.errors.push({ name: ds.name, error: err.message });
      }
    }

    // Reset cached data source references
    primaryDataSourceName = null;
    dataSourceFeedLabel = null;
    dataSourceContentLanguage = null;
    dataSources.primary.name = null;
    dataSources.KR.name = null;
    productInputsClient = null; // Force re-init on next call

    return { success: true, ...results };
  } catch (error) {
    console.error("[MerchantAPI] Error deleting data sources:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete ALL products using Content API (REST - more reliable)
 * This uses the older Content API which doesn't have gRPC encoding issues
 */
async function deleteAllProductsViaRest() {
  console.log("[MerchantAPI-REST] Starting delete all products via REST...");

  await initClient(); // For listing products
  await initContentApiClient(); // For deleting

  const results = { deleted: 0, failed: 0, errors: [], method: "REST" };

  try {
    // List products using the new API (it works for listing)
    const listResult = await listProducts(500);
    if (!listResult.success) {
      return { success: false, error: listResult.error, method: "REST" };
    }

    console.log(`[MerchantAPI-REST] Found ${listResult.data.length} total products to delete`);

    for (const product of listResult.data) {
      try {
        // Extract productId from name
        // Format: accounts/xxx/products/online~en~FEEDLABEL~OFFERID
        const nameParts = product.name.split('/');
        const productPart = nameParts[nameParts.length - 1]; // online~en~FEEDLABEL~OFFERID
        const parts = productPart.split('~');

        if (parts.length < 4) {
          console.log(`[MerchantAPI-REST] Skipping invalid product format: ${productPart}`);
          continue;
        }

        const channel = parts[0]; // online
        const contentLanguage = parts[1]; // en
        const feedLabel = parts[2]; // FATBIGQUIZ-DOWNLOADS or KR
        const offerId = parts[3]; // uuid

        // Content API requires: channel:contentLanguage:feedLabel:offerId
        // Use the feedLabel directly (not converted to country)
        const productId = `${channel}:${contentLanguage}:${feedLabel}:${offerId}`;

        console.log(`[MerchantAPI-REST] Deleting productId: ${productId}`);

        await contentApiClient.products.delete({
          merchantId: MERCHANT_ID,
          productId: productId,
        });

        results.deleted++;
        console.log(`[MerchantAPI-REST] Successfully deleted: ${productId}`);
      } catch (err) {
        // 404 is fine - product doesn't exist
        if (err.code === 404 || (err.response && err.response.status === 404)) {
          console.log(`[MerchantAPI-REST] Product not found (already deleted)`);
          results.deleted++;
        } else {
          console.error(`[MerchantAPI-REST] Delete error for ${product.name}:`, err.message);
          results.failed++;
          results.errors.push({ product: product.name, error: err.message });
        }
      }
    }

    console.log(`[MerchantAPI-REST] Delete complete: ${results.deleted} deleted, ${results.failed} failed`);
    return { success: true, ...results };
  } catch (error) {
    console.error("[MerchantAPI-REST] Error:", error.message);
    return { success: false, error: error.message, method: "REST" };
  }
}

/**
 * List all products (for debugging/status)
 * Note: The new API lists processed products separately
 */
async function listProducts(maxResults = 250) {
  await initClient();

  try {
    const parent = `accounts/${MERCHANT_ID}`;
    const products = [];

    const request = {
      parent,
      pageSize: Math.min(maxResults, 250),
    };

    // Use the Products service to list processed products
    const { ProductsServiceClient } = require("@google-shopping/products").v1beta;
    const productsClient = new ProductsServiceClient({
      keyFilename: CREDENTIALS_PATH,
    });

    const iterable = productsClient.listProductsAsync(request);
    for await (const product of iterable) {
      products.push(product);
      if (products.length >= maxResults) break;
    }

    return { success: true, data: products, count: products.length };
  } catch (error) {
    console.error("[MerchantAPI] Failed to list products:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Batch insert multiple products
 */
async function batchUpsertProducts(productsData) {
  await initClient();

  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Process products in sequence (API doesn't have true batch for new API yet)
  for (const product of productsData) {
    const result = await upsertProduct(product);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        productId: product.offerId,
        errors: [{ message: result.error }],
      });
    }
  }

  console.log(`[MerchantAPI] Batch upsert: ${results.success} success, ${results.failed} failed`);
  return { success: true, data: results };
}

/**
 * Check if the Merchant API is configured
 */
function isConfigured() {
  return !!(MERCHANT_ID && CREDENTIALS_PATH);
}

/**
 * Test connection to Merchant API
 */
async function testConnection() {
  try {
    await initClient();
    return { success: true, message: "Connected successfully" };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  initClient,
  upsertProduct,
  deleteProduct,
  deleteAllKRProducts,
  deleteAllProducts,
  deleteAllProductsViaRest,
  deleteDataSources,
  listProducts,
  batchUpsertProducts,
  isConfigured,
  testConnection,
  MERCHANT_ID,
};
