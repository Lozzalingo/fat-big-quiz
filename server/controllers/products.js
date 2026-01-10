const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { deleteFromSpaces, getKey } = require("../utils/spaces");
const merchantApi = require("../services/merchantApi");
const { formatProductForMerchant } = require("../utils/merchantFeed");
const googleIndexing = require("../services/googleIndexing");

/**
 * Sync a product to Google Merchant Center (non-blocking)
 * Call this after creating or updating a product
 */
async function syncProductToMerchant(productId) {
  if (!merchantApi.isConfigured()) {
    return; // Skip if not configured
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        categories: { include: { category: true } },
        quizFormat: true,
        images: true,
      },
    });

    if (!product || product.price <= 0) {
      return; // Skip products without price
    }

    const formatted = formatProductForMerchant(product);
    const result = await merchantApi.upsertProduct(formatted);

    if (result.success) {
      console.log(`[Merchant] Auto-synced product: ${product.title}`);
    } else {
      console.error(`[Merchant] Failed to auto-sync product ${product.title}:`, result.error);
    }
  } catch (error) {
    console.error(`[Merchant] Error auto-syncing product ${productId}:`, error.message);
  }
}

/**
 * Remove a product from Google Merchant Center (non-blocking)
 * Call this before deleting a product
 */
async function removeProductFromMerchant(productId) {
  if (!merchantApi.isConfigured()) {
    return;
  }

  try {
    const result = await merchantApi.deleteProduct(productId);
    if (result.success) {
      console.log(`[Merchant] Removed product from Merchant Center: ${productId}`);
    }
  } catch (error) {
    console.error(`[Merchant] Error removing product ${productId}:`, error.message);
  }
}

/**
 * Submit a product URL for Google indexing (non-blocking)
 * Call this after creating or updating a product
 */
async function submitProductForIndexing(slug, type = "URL_UPDATED") {
  if (!googleIndexing.isConfigured()) {
    return; // Skip if not configured
  }

  try {
    const url = `https://fatbigquiz.com/product/${slug}`;
    const result = await googleIndexing.submitUrl(url, type);

    if (result.success) {
      console.log(`[Indexing] Submitted for indexing: ${url}`);
    } else {
      console.error(`[Indexing] Failed to submit ${url}:`, result.error);
    }
  } catch (error) {
    console.error(`[Indexing] Error submitting product ${slug}:`, error.message);
  }
}

async function getAllProducts(request, response) {
  const mode = request.query.mode || "";
  const searchQuery = request.query.search || ""; // Search parameter

  // checking if we are on the admin products page because we don't want to have filtering, sorting and pagination there
  if(mode === "admin"){
    try {
      const adminProducts = await prisma.product.findMany({
        include: {
          category: { select: { name: true } },
          quizFormat: { select: { id: true, name: true, displayName: true } },
          categories: {
            include: { category: { select: { id: true, name: true } } },
          },
        },
        orderBy: { displayOrder: "asc" },
      });
      return response.json(adminProducts);
    } catch (error) {
      return response.status(500).json({ error: "Error fetching products" });
    }
  }else{
    const dividerLocation = request.url.indexOf("?");
    let filterObj = {};
    let sortObj = {};
    let sortByValue = "defaultSort";
  
    // getting current page
    const page = Number(request.query.page) ? Number(request.query.page) : 1;
  
    if (dividerLocation !== -1) {
      const queryArray = request.url
        .substring(dividerLocation + 1, request.url.length)
        .split("&");
  
      let filterType;
      let filterArray = [];
  
      for (let i = 0; i < queryArray.length; i++) {
        // checking whether it is filter mode or price filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("price") !== -1
        ) {
  
          // taking price par. Of course I could write it much simpler: filterType="price"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("price"),
            queryArray[i].indexOf("price") + "price".length
          );
        }
  
        // checking whether it is filter mode and rating filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("rating") !== -1
        ) {
  
          // taking "rating" part. Of course I could write it much simpler: filterType="rating"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("rating"),
            queryArray[i].indexOf("rating") + "rating".length
          );
        }
  
        // checking whether it is filter mode and category filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("category") !== -1
        ) {
          // getting "category" part
          filterType = "category";
        }

        // checking whether it is filter mode and quizFormat filter
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("quizFormat") !== -1
        ) {
          filterType = "quizFormat";
        }
  
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("inStock") !== -1
        ) {
          // getting "inStock" part.  Of course I could write it much simpler: filterType="inStock"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("inStock"),
            queryArray[i].indexOf("inStock") + "inStock".length
          );
        }
  
        if (
          queryArray[i].indexOf("filters") !== -1 &&
          queryArray[i].indexOf("outOfStock") !== -1
        ) {
          // getting "outOfStock" part.  Of course I could write it much simpler: filterType="outOfStock"
          filterType = queryArray[i].substring(
            queryArray[i].indexOf("outOfStock"),
            queryArray[i].indexOf("outOfStock") + "outOfStock".length
          );
        }
  
        if (queryArray[i].indexOf("sort") !== -1) {
          // getting sort value from the query
          sortByValue = queryArray[i].substring(queryArray[i].indexOf("=") + 1);
        }
  
        // checking whether in the given query filters mode is on
        if (queryArray[i].indexOf("filters") !== -1) {
          let filterValue;
          // checking that it is not filter by category or quizFormat. I am doing it so I can avoid converting string to number
          if (queryArray[i].indexOf("category") === -1 && queryArray[i].indexOf("quizFormat") === -1) {
            // taking value part. It is the part where number value of the query is located and I am converting it to the number type because it is string by default
            filterValue = parseInt(
              queryArray[i].substring(
                queryArray[i].indexOf("=") + 1,
                queryArray[i].length
              )
            );
          } else {
            // if it is filter by category or quizFormat (string values)
            filterValue = queryArray[i].substring(
              queryArray[i].indexOf("=") + 1,
              queryArray[i].length
            );
          }
  
          // getting operator for example: lte, gte, gt, lt....
          const filterOperator = queryArray[i].substring(
            queryArray[i].indexOf("$") + 1,
            queryArray[i].indexOf("=") - 1
          );
  
          // All of it I add to the filterArray
          // example for current state of filterArray:
          /*
                  [
                  { filterType: 'price', filterOperator: 'lte', filterValue: 3000 },
                  { filterType: 'rating', filterOperator: 'gte', filterValue: 0 }
                  ]
                  */
          filterArray.push({ filterType, filterOperator, filterValue });
        }
      }
      for (let item of filterArray) {
        filterObj = {
          ...filterObj,
          [item.filterType]: {
            [item.filterOperator]: item.filterValue,
          },
        };
      }
    }
  
    let whereClause = { ...filterObj }; // Include other filters if any

    // Remove category filter from whereClause and use it separately
    if (filterObj.category && filterObj.category.equals) {
      delete whereClause.category; // Remove category filter from whereClause
    }

    // Remove quizFormat filter from whereClause and use it separately
    if (filterObj.quizFormat && filterObj.quizFormat.equals) {
      delete whereClause.quizFormat; // Remove quizFormat filter from whereClause
    }

    if (sortByValue === "defaultSort") {
      sortObj = { displayOrder: "asc" };
    } else if (sortByValue === "titleAsc") {
      sortObj = {
        title: "asc",
      };
    } else if (sortByValue === "titleDesc") {
      sortObj = {
        title: "desc",
      };
    } else if (sortByValue === "lowPrice") {
      sortObj = {
        price: "asc",
      };
    } else if (sortByValue === "highPrice") {
      sortObj = {
        price: "desc",
      };
    }
  
    let products;

    // Standard includes for shop page products
    const shopIncludes = {
      category: { select: { name: true } },
      quizFormat: { select: { id: true, name: true, displayName: true, explainerImages: true } },
      categories: {
        include: { category: { select: { id: true, name: true } } },
      },
    };

    // Build where clause with category, quizFormat, and search filters
    const buildWhereClause = () => {
      let where = { ...whereClause };

      // Add category filter (via many-to-many relation)
      if (filterObj.category && filterObj.category.equals) {
        where.categories = {
          some: {
            category: {
              name: { equals: filterObj.category.equals },
            },
          },
        };
      }

      // Add quizFormat filter
      if (filterObj.quizFormat && filterObj.quizFormat.equals) {
        where.quizFormat = {
          name: { equals: filterObj.quizFormat.equals },
        };
      }

      // Add search filter (searches title, description, tags, category names)
      if (searchQuery) {
        where.OR = [
          { title: { contains: searchQuery } },
          { description: { contains: searchQuery } },
          { tags: { contains: searchQuery } },
          { category: { name: { contains: searchQuery } } },
          { categories: { some: { category: { name: { contains: searchQuery } } } } },
          { quizFormat: { displayName: { contains: searchQuery } } },
        ];
      }

      return where;
    };

    // Always use buildWhereClause to include search filter
    const whereConditions = buildWhereClause();
    const hasFilters = Object.keys(filterObj).length > 0 || searchQuery;

    if (!hasFilters) {
      products = await prisma.product.findMany({
        skip: (page - 1) * 10,
        take: 12,
        include: shopIncludes,
        orderBy: sortObj,
      });
    } else {
      products = await prisma.product.findMany({
        skip: (page - 1) * 10,
        take: 12,
        include: shopIncludes,
        where: whereConditions,
        orderBy: sortObj,
      });
    }

    return response.json(products);
  }
  
}

async function getAllProductsOld(request, response) {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    response.status(200).json(products);
  } catch (error) {
    console.log(error);
  }
}

async function createProduct(request, response) {
  console.log("createProduct called with body:", JSON.stringify(request.body, null, 2));
  try {
    const {
      slug,
      title,
      mainImage,
      price,
      description,
      manufacturer,
      categoryId,
      categoryIds, // NEW: Array of category IDs for many-to-many
      quizFormatId, // NEW: Quiz format ID
      inStock,
      productType,
      downloadFile,
      features,
      videoUrl,
      tags, // Array of tag strings
    } = request.body;

    const product = await prisma.product.create({
      data: {
        slug,
        title,
        mainImage,
        price,
        rating: 5,
        description,
        manufacturer,
        categoryId, // Keep legacy field for now
        quizFormatId: quizFormatId || null,
        inStock,
        productType: productType || "PHYSICAL",
        downloadFile: downloadFile || null,
        features: features || null,
        videoUrl: videoUrl || null,
        tags: tags ? JSON.stringify(tags) : null,
        // Create many-to-many category relationships
        categories: categoryIds && categoryIds.length > 0 ? {
          create: categoryIds.map((catId) => ({
            categoryId: catId,
          })),
        } : undefined,
      },
      include: {
        category: { select: { name: true } },
        quizFormat: { select: { id: true, name: true, displayName: true } },
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });
    // Auto-sync to Google Merchant Center (non-blocking)
    syncProductToMerchant(product.id).catch(() => {});
    // Auto-submit for Google indexing (non-blocking)
    submitProductForIndexing(product.slug).catch(() => {});

    return response.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return response.status(500).json({ error: "Error creating product" });
  }
}

// Method for updating existing product
async function updateProduct(request, response) {
  try {
    const { id } = request.params;
    const {
      slug,
      title,
      mainImage,
      price,
      rating,
      description,
      manufacturer,
      categoryId,
      categoryIds, // NEW: Array of category IDs for many-to-many
      quizFormatId, // NEW: Quiz format ID
      inStock,
      productType,
      downloadFile,
      features,
      videoUrl,
      tags, // Array of tag strings
    } = request.body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return response.status(404).json({ error: "Product not found" });
    }

    // Handle categoryId - empty string means clear it, undefined means keep existing
    let resolvedCategoryId = existingProduct.categoryId;
    if (categoryId !== undefined) {
      resolvedCategoryId = categoryId === "" || categoryId === null ? null : categoryId;
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title,
        mainImage,
        slug,
        price,
        rating,
        description,
        manufacturer,
        categoryId: resolvedCategoryId,
        quizFormatId: quizFormatId !== undefined ? quizFormatId : existingProduct.quizFormatId,
        inStock,
        productType: productType || existingProduct.productType,
        downloadFile: downloadFile !== undefined ? downloadFile : existingProduct.downloadFile,
        features: features !== undefined ? features : existingProduct.features,
        videoUrl: videoUrl !== undefined ? videoUrl : existingProduct.videoUrl,
        tags: tags !== undefined ? JSON.stringify(tags) : existingProduct.tags,
      },
    });

    // Handle category updates if categoryIds is provided
    if (categoryIds !== undefined) {
      // Delete existing category relationships
      await prisma.productCategory.deleteMany({
        where: { productId: id },
      });

      // Create new category relationships
      if (categoryIds && categoryIds.length > 0) {
        await prisma.productCategory.createMany({
          data: categoryIds.map((catId) => ({
            productId: id,
            categoryId: catId,
          })),
        });
      }
    }

    // Fetch the updated product with all relations
    const productWithRelations = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        quizFormat: { select: { id: true, name: true, displayName: true } },
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    // Auto-sync to Google Merchant Center (non-blocking)
    syncProductToMerchant(id).catch(() => {});
    // Auto-submit for Google indexing (non-blocking)
    submitProductForIndexing(productWithRelations.slug).catch(() => {});

    return response.status(200).json(productWithRelations);
  } catch (error) {
    console.error("Error updating product:", error);
    return response.status(500).json({ error: "Error updating product" });
  }
}

// Method for deleting a product
async function deleteProduct(request, response) {
  try {
    const { id } = request.params;
    const forceDelete = request.query.force === 'true';

    // Check for related records in order_product table
    const relatedOrderProductItems = await prisma.customer_order_product.findMany({
      where: {
        productId: id,
      },
    });
    if (relatedOrderProductItems.length > 0 && !forceDelete) {
      return response.status(400).json({ error: 'Cannot delete product because it has orders. Use ?force=true to delete anyway.' });
    }

    // Check for purchases
    const relatedPurchases = await prisma.purchase.findMany({
      where: { productId: id },
    });
    if (relatedPurchases.length > 0 && !forceDelete) {
      return response.status(400).json({
        error: `Cannot delete product because it has ${relatedPurchases.length} purchase(s). Use ?force=true to delete anyway.`
      });
    }

    // Get the product first to clean up files and notify indexing
    const product = await prisma.product.findUnique({
      where: { id },
      select: { mainImage: true, downloadFile: true, slug: true },
    });

    if (product) {
      // Delete main image from Spaces
      if (product.mainImage && !product.mainImage.startsWith('http')) {
        try {
          const imageKey = getKey(product.mainImage, 'products/images');
          await deleteFromSpaces(imageKey);
          console.log(`Deleted product image from Spaces: ${imageKey}`);
        } catch (err) {
          console.error(`Error deleting product image: ${err.message}`);
        }
      }

      // Delete download files from Spaces
      if (product.downloadFile) {
        try {
          // Parse download files (could be JSON array or single filename)
          let downloadFiles;
          try {
            downloadFiles = JSON.parse(product.downloadFile);
            if (!Array.isArray(downloadFiles)) {
              downloadFiles = [product.downloadFile];
            }
          } catch {
            downloadFiles = [product.downloadFile];
          }

          // Delete each download file
          for (const file of downloadFiles) {
            if (!file.startsWith('http')) {
              const fileKey = getKey(file, 'downloads');
              await deleteFromSpaces(fileKey);
              console.log(`Deleted download file from Spaces: ${fileKey}`);
            }
          }
        } catch (err) {
          console.error(`Error deleting download files: ${err.message}`);
        }
      }
    }

    // Remove from Google Merchant Center before deleting (non-blocking)
    removeProductFromMerchant(id).catch(() => {});
    // Notify Google Indexing API of deletion (non-blocking)
    if (product?.slug) {
      submitProductForIndexing(product.slug, "URL_DELETED").catch(() => {});
    }

    // Delete all related records first (in order to avoid FK constraints)
    await prisma.productCategory.deleteMany({ where: { productId: id } });
    await prisma.discountCodeProduct.deleteMany({ where: { productId: id } });
    await prisma.wishlist.deleteMany({ where: { productId: id } });
    await prisma.image.deleteMany({ where: { productID: id } });
    await prisma.purchase.deleteMany({ where: { productId: id } });
    await prisma.customer_order_product.deleteMany({ where: { productId: id } });

    // Delete the product from database
    await prisma.product.delete({
      where: { id },
    });

    return response.status(204).send();
  } catch (error) {
    console.log(error);
    return response.status(500).json({ error: "Error deleting product" });
  }
}

async function searchProducts(request, response) {
  try {
    const { query } = request.query;
    if (!query) {
      return response
        .status(400)
        .json({ error: "Query parameter is required" });
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
            },
          },
          {
            description: {
              contains: query,
            },
          },
        ],
      },
    });

    return response.json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    return response.status(500).json({ error: "Error searching products" });
  }
}

async function getProductById(request, response) {
  const { id } = request.params;
  const product = await prisma.product.findUnique({
    where: {
      id: id,
    },
    include: {
      category: true,
      quizFormat: true,
      categories: {
        include: { category: true },
      },
    },
  });
  if (!product) {
    return response.status(404).json({ error: "Product not found" });
  }
  return response.status(200).json(product);
}

async function duplicateProduct(request, response) {
  try {
    const { id } = request.params;

    // Get the original product with all relations
    const original = await prisma.product.findUnique({
      where: { id },
      include: {
        categories: true,
      },
    });

    if (!original) {
      return response.status(404).json({ error: "Product not found" });
    }

    // Generate unique slug
    const timestamp = Date.now();
    const newSlug = `${original.slug}-copy-${timestamp}`;
    const newTitle = `${original.title} (Copy)`;

    // Create the duplicate product
    const duplicate = await prisma.product.create({
      data: {
        slug: newSlug,
        title: newTitle,
        mainImage: original.mainImage,
        price: original.price,
        rating: original.rating,
        description: original.description,
        manufacturer: original.manufacturer,
        categoryId: original.categoryId,
        quizFormatId: original.quizFormatId,
        inStock: original.inStock,
        productType: original.productType,
        downloadFile: original.downloadFile,
        features: original.features,
        videoUrl: original.videoUrl,
        tags: original.tags, // Copy tags
        // Copy category relationships
        categories: original.categories.length > 0 ? {
          create: original.categories.map((cat) => ({
            categoryId: cat.categoryId,
          })),
        } : undefined,
      },
      include: {
        category: { select: { name: true } },
        quizFormat: { select: { id: true, name: true, displayName: true } },
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });

    return response.status(201).json(duplicate);
  } catch (error) {
    console.error("Error duplicating product:", error);
    return response.status(500).json({ error: "Error duplicating product" });
  }
}

// Reorder products by displayOrder
async function reorderProducts(request, response) {
  try {
    const { orderedIds } = request.body;

    if (!Array.isArray(orderedIds)) {
      return response.status(400).json({ error: "orderedIds must be an array" });
    }

    // Update each product's displayOrder in a transaction
    const updates = orderedIds.map((id, index) =>
      prisma.product.update({
        where: { id },
        data: { displayOrder: index },
      })
    );

    await prisma.$transaction(updates);

    // Return updated products list
    const products = await prisma.product.findMany({
      include: {
        category: { select: { name: true } },
        quizFormat: { select: { id: true, name: true, displayName: true } },
        categories: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return response.status(200).json(products);
  } catch (error) {
    console.error("Error reordering products:", error);
    return response.status(500).json({ error: "Error reordering products" });
  }
}

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductById,
  duplicateProduct,
  reorderProducts,
};
