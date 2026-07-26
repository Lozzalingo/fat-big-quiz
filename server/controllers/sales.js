// Sales Controller - Unified sales tracking (Website + Etsy)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse Etsy money format { amount, divisor, currency_code } into integer pence.
 * Etsy sends amounts already in minor units when divisor=100,
 * but if divisor differs we normalise to pence.
 */
function parseEtsyMoney(moneyObj) {
  if (!moneyObj || moneyObj.amount == null) return 0;
  const { amount, divisor, currency_code } = moneyObj;
  if (!divisor || divisor === 100) return Math.round(Number(amount));
  // Convert to major units then back to pence
  return Math.round((Number(amount) / Number(divisor)) * 100);
}

/**
 * Parse Etsy currency code from any money field in the receipt.
 */
function parseEtsyCurrency(moneyObj) {
  if (!moneyObj || !moneyObj.currency_code) return "GBP";
  return moneyObj.currency_code.toUpperCase();
}

// ─── Etsy Webhook (called by MAKE) ───────────────────────────────────────────

async function receiveEtsyWebhook(req, res) {
  try {
    const webhookKey = process.env.WEBHOOK_API_KEY;
    if (!webhookKey || req.headers["x-webhook-key"] !== webhookKey) {
      console.log("[Sales] Etsy webhook rejected - invalid or missing x-webhook-key");
      return res.status(401).json({ error: "Unauthorised" });
    }

    const data = req.body;
    const receiptId = String(data.receipt_id);

    if (!receiptId) {
      console.log("[Sales] Etsy webhook rejected - missing receipt_id");
      return res.status(400).json({ error: "Missing receipt_id" });
    }

    console.log("[Sales] Etsy webhook received, receipt:", receiptId);

    // Duplicate detection
    const existing = await prisma.sale.findUnique({
      where: { externalReceiptId: receiptId },
      include: { items: true },
    });

    if (existing) {
      console.log("[Sales] Duplicate receipt, returning existing sale:", existing.id);
      return res.status(200).json({ duplicate: true, sale: existing });
    }

    // Parse financials
    const currency = parseEtsyCurrency(data.grand_total || data.subtotal);
    const subtotal = parseEtsyMoney(data.subtotal);
    const shippingCost = parseEtsyMoney(data.shipping_cost);
    const shippingDiscount = parseEtsyMoney(data.shipping_discount);
    const taxTotal = parseEtsyMoney(data.total_tax);
    const vatTotal = parseEtsyMoney(data.total_vat);
    const discountTotal = parseEtsyMoney(data.discount);
    const grandTotal = parseEtsyMoney(data.grand_total);
    const processingFees = parseEtsyMoney(data.processing_fees);
    const orderNet = parseEtsyMoney(data.order_net);

    // Parse address
    const addr = data.shipping_address || {};

    // Parse paid timestamp
    let paidAt = null;
    if (data.paid_at) {
      paidAt = new Date(data.paid_at);
    } else if (data.create_timestamp) {
      paidAt = new Date(Number(data.create_timestamp) * 1000);
    }

    // Parse transactions into sale items
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const saleItems = transactions.map((tx) => ({
      externalTransactionId: tx.transaction_id ? String(tx.transaction_id) : null,
      externalListingId: tx.listing_id ? String(tx.listing_id) : null,
      externalProductId: tx.product_id ? String(tx.product_id) : null,
      title: tx.title || "Untitled Etsy Product",
      description: tx.description || null,
      sku: tx.sku || null,
      quantity: tx.quantity || 1,
      unitPrice: parseEtsyMoney(tx.price),
      currency,
      isDigital: tx.is_digital === true,
      variations: tx.variations ? JSON.stringify(tx.variations) : null,
      couponCode: null,
      couponDiscount: (tx.buyer_coupon || 0) + (tx.shop_coupon || 0),
      vatAmount: parseEtsyMoney(tx.vat_paid_by_buyer),
    }));

    // Create sale with items in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          channel: "ETSY",
          externalReceiptId: receiptId,
          buyerEmail: data.buyer_email || "",
          buyerName: data.buyer_name || null,
          buyerUserId: data.buyer_user_id ? String(data.buyer_user_id) : null,
          paymentMethod: data.payment_method || null,
          subtotal,
          shippingCost,
          shippingDiscount,
          taxTotal,
          vatTotal,
          discountTotal,
          grandTotal,
          processingFees,
          orderNet,
          currency,
          shippingLine1: addr.first_line || null,
          shippingLine2: addr.second_line || null,
          shippingCity: addr.city || null,
          shippingState: addr.state || null,
          shippingPostalCode: addr.zip || addr.postcode || null,
          shippingCountry: addr.country || null,
          shippingCountryISO: addr.country_iso || null,
          status: "COMPLETED",
          paidAt,
          completedAt: paidAt,
          rawPayload: JSON.stringify(data),
          items: {
            create: saleItems,
          },
        },
        include: { items: true },
      });

      return newSale;
    });

    console.log("[Sales] Etsy sale created:", sale.id, "items:", sale.items.length, "total:", grandTotal, currency);
    return res.status(201).json({ duplicate: false, sale });
  } catch (error) {
    console.error("[Sales] Etsy webhook error:", error.message);
    return res.status(500).json({ error: "Error processing Etsy webhook" });
  }
}

// ─── Website Sale Creation (called at checkout start) ────────────────────────

async function createWebsiteSale(req, res) {
  try {
    const {
      buyerEmail, buyerName, buyerPhone, userId,
      items, // Array of { productId, title, unitPrice, quantity, isDigital, sku }
      subtotal, currency,
    } = req.body;

    if (!buyerEmail || !items || !items.length) {
      console.log("[Sales] Website sale rejected - missing email or items");
      return res.status(400).json({ error: "Missing buyerEmail or items" });
    }

    console.log("[Sales] Creating website sale for:", buyerEmail, "items:", items.length);

    const grandTotal = subtotal || items.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 1)), 0);

    const sale = await prisma.sale.create({
      data: {
        channel: "WEBSITE",
        buyerEmail,
        buyerName: buyerName || null,
        buyerPhone: buyerPhone || null,
        buyerUserId: userId || null,
        subtotal: grandTotal,
        grandTotal,
        currency: currency || "GBP",
        status: "PENDING",
        items: {
          create: items.map((item) => ({
            productId: item.productId || null,
            title: item.title || "Quiz Pack",
            description: item.description || null,
            sku: item.sku || null,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            currency: currency || "GBP",
            isDigital: item.isDigital !== false,
          })),
        },
      },
      include: { items: true },
    });

    console.log("[Sales] Website sale created (PENDING):", sale.id);
    return res.status(201).json(sale);
  } catch (error) {
    console.error("[Sales] Website sale creation error:", error.message);
    return res.status(500).json({ error: "Error creating sale" });
  }
}

// ─── Update Sale Status (called by Stripe webhook) ──────────────────────────

async function updateSaleByStripeSession(stripeSessionId, updateData) {
  try {
    const sale = await prisma.sale.findFirst({
      where: { stripeSessionId },
    });

    if (!sale) {
      console.log("[Sales] No sale found for Stripe session:", stripeSessionId);
      return null;
    }

    const updated = await prisma.sale.update({
      where: { id: sale.id },
      data: {
        status: updateData.status || "PAID",
        stripePaymentId: updateData.stripePaymentId || null,
        paymentMethod: updateData.paymentMethod || "card",
        paidAt: updateData.paidAt || new Date(),
        // Stripe can provide updated financials and geography
        ...(updateData.grandTotal != null && { grandTotal: updateData.grandTotal }),
        ...(updateData.vatTotal != null && { vatTotal: updateData.vatTotal }),
        ...(updateData.shippingCountry && { shippingCountry: updateData.shippingCountry }),
        ...(updateData.shippingCountryISO && { shippingCountryISO: updateData.shippingCountryISO }),
        ...(updateData.shippingCity && { shippingCity: updateData.shippingCity }),
        ...(updateData.shippingPostalCode && { shippingPostalCode: updateData.shippingPostalCode }),
      },
      include: { items: true },
    });

    console.log("[Sales] Sale updated to", updated.status, "for Stripe session:", stripeSessionId);
    return updated;
  } catch (error) {
    console.error("[Sales] Error updating sale by Stripe session:", error.message);
    return null;
  }
}

// ─── Admin: List Sales ───────────────────────────────────────────────────────

async function getAllSales(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const where = {};

    if (req.query.channel) {
      where.channel = req.query.channel.toUpperCase();
    }

    if (req.query.status) {
      where.status = req.query.status.toUpperCase();
    }

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to);
    }

    if (req.query.search) {
      where.OR = [
        { buyerEmail: { contains: req.query.search } },
        { buyerName: { contains: req.query.search } },
        { externalReceiptId: { contains: req.query.search } },
      ];
    }

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    console.log("[Sales] Listed", sales.length, "of", total, "sales (page", page, ")");

    return res.status(200).json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Sales] Error listing sales:", error.message);
    return res.status(500).json({ error: "Error listing sales" });
  }
}

// ─── Admin: Get Single Sale ──────────────────────────────────────────────────

async function getSaleById(req, res) {
  try {
    const { id } = req.params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!sale) {
      return res.status(404).json({ error: "Sale not found" });
    }

    return res.status(200).json(sale);
  } catch (error) {
    console.error("[Sales] Error fetching sale:", error.message);
    return res.status(500).json({ error: "Error fetching sale" });
  }
}

// ─── Admin: Sales Stats ──────────────────────────────────────────────────────

async function getSalesStats(req, res) {
  try {
    const where = {};

    if (req.query.from || req.query.to) {
      where.createdAt = {};
      if (req.query.from) where.createdAt.gte = new Date(req.query.from);
      if (req.query.to) where.createdAt.lte = new Date(req.query.to);
    }

    // Exclude pending (abandoned) from revenue stats
    const paidWhere = { ...where, status: { in: ["PAID", "COMPLETED"] } };

    const [
      totalSales,
      websiteSales,
      etsySales,
      websiteRevenue,
      etsyRevenue,
      abandonedCarts,
    ] = await Promise.all([
      prisma.sale.count({ where: paidWhere }),
      prisma.sale.count({ where: { ...paidWhere, channel: "WEBSITE" } }),
      prisma.sale.count({ where: { ...paidWhere, channel: "ETSY" } }),
      prisma.sale.aggregate({ where: { ...paidWhere, channel: "WEBSITE" }, _sum: { grandTotal: true } }),
      prisma.sale.aggregate({ where: { ...paidWhere, channel: "ETSY" }, _sum: { grandTotal: true } }),
      prisma.sale.count({ where: { ...where, status: "PENDING" } }),
    ]);

    // Top countries
    const countryCounts = await prisma.sale.groupBy({
      by: ["shippingCountryISO"],
      where: paidWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    console.log("[Sales] Stats: total", totalSales, "website", websiteSales, "etsy", etsySales, "abandoned", abandonedCarts);

    return res.status(200).json({
      totalSales,
      websiteSales,
      etsySales,
      websiteRevenue: websiteRevenue._sum.grandTotal || 0,
      etsyRevenue: etsyRevenue._sum.grandTotal || 0,
      totalRevenue: (websiteRevenue._sum.grandTotal || 0) + (etsyRevenue._sum.grandTotal || 0),
      abandonedCarts,
      topCountries: countryCounts.map((c) => ({
        country: c.shippingCountryISO || "Unknown",
        count: c._count.id,
      })),
    });
  } catch (error) {
    console.error("[Sales] Error fetching stats:", error.message);
    return res.status(500).json({ error: "Error fetching sales stats" });
  }
}

module.exports = {
  receiveEtsyWebhook,
  createWebsiteSale,
  updateSaleByStripeSession,
  getAllSales,
  getSaleById,
  getSalesStats,
};
