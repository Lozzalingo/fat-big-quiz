const prisma = require("../../utils/prisma");
const { DISCOUNT_CODE_SELECT } = require("../../utils/prismaIncludes");

// Get all discount codes
const getAllDiscountCodes = async (req, res) => {
  try {
    const discountCodes = await prisma.discountCode.findMany({
      select: DISCOUNT_CODE_SELECT,
    });
    res.status(200).json(discountCodes);
  } catch (error) {
    console.error('[DiscountCodes] Error fetching discount codes:', error);
    res.status(500).json({ error: 'Failed to fetch discount codes' });
  }
};

// Get a single discount code by ID
const getDiscountCodeById = async (req, res) => {
  const { id } = req.params;
  try {
    const discountCode = await prisma.discountCode.findUnique({
      where: { id },
      select: DISCOUNT_CODE_SELECT,
    });
    if (!discountCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    res.status(200).json(discountCode);
  } catch (error) {
    console.error('[DiscountCodes] Error fetching discount code:', error);
    res.status(500).json({ error: 'Failed to fetch discount code' });
  }
};

// Create a new discount code
const createDiscountCode = async (req, res) => {
  const {
    code,
    discountType,
    discountValue,
    startDate,
    endDate,
    minPurchase,
    maxRedemptions,
    isActive,
  } = req.body;

  if (!code || !discountType || discountValue == null) {
    return res.status(400).json({ error: 'Code, discount type, and discount value are required' });
  }

  try {
    const existingCode = await prisma.discountCode.findUnique({ where: { code } });
    if (existingCode) {
      return res.status(400).json({ error: 'Discount code already exists' });
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        code,
        discountType,
        discountValue: parseFloat(discountValue),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        minPurchase: minPurchase ? parseInt(minPurchase) : null,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
      select: DISCOUNT_CODE_SELECT,
    });
    res.status(201).json(discountCode);
  } catch (error) {
    console.error('[DiscountCodes] Error creating discount code:', error);
    res.status(500).json({ error: 'Failed to create discount code' });
  }
};

// Update a discount code
const updateDiscountCode = async (req, res) => {
  const { id } = req.params;
  const {
    code,
    discountType,
    discountValue,
    startDate,
    endDate,
    minPurchase,
    maxRedemptions,
    isActive,
  } = req.body;

  try {
    const existingCode = await prisma.discountCode.findUnique({ where: { id } });
    if (!existingCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    // Check for code uniqueness if code is being updated
    if (code && code !== existingCode.code) {
      const codeExists = await prisma.discountCode.findUnique({ where: { code } });
      if (codeExists) {
        return res.status(400).json({ error: 'Discount code already exists' });
      }
    }

    const discountCode = await prisma.discountCode.update({
      where: { id },
      data: {
        code: code || existingCode.code,
        discountType: discountType || existingCode.discountType,
        discountValue:
          discountValue != null ? parseFloat(discountValue) : existingCode.discountValue,
        startDate: startDate ? new Date(startDate) : startDate === null ? null : existingCode.startDate,
        endDate: endDate ? new Date(endDate) : endDate === null ? null : existingCode.endDate,
        minPurchase: minPurchase ? parseInt(minPurchase) : minPurchase === null ? null : existingCode.minPurchase,
        maxRedemptions: maxRedemptions
          ? parseInt(maxRedemptions)
          : maxRedemptions === null
          ? null
          : existingCode.maxRedemptions,
        isActive: isActive !== undefined ? isActive : existingCode.isActive,
      },
      select: DISCOUNT_CODE_SELECT,
    });
    res.status(200).json(discountCode);
  } catch (error) {
    console.error('[DiscountCodes] Error updating discount code:', error);
    res.status(500).json({ error: 'Failed to update discount code' });
  }
};

// Delete a discount code
const deleteDiscountCode = async (req, res) => {
  const { id } = req.params;
  try {
    const discountCode = await prisma.discountCode.findUnique({ where: { id } });
    if (!discountCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }

    await prisma.discountCode.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('[DiscountCodes] Error deleting discount code:', error);
    res.status(500).json({ error: 'Failed to delete discount code' });
  }
};

// Validate and apply a discount code (public endpoint, no admin required)
const validateDiscountCode = async (req, res) => {
  const { code, subtotal, productIds } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Discount code is required' });
  }

  try {
    const discountCode = await prisma.discountCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        applicableProducts: { select: { productId: true } },
      },
    });

    if (!discountCode) {
      return res.status(404).json({ error: 'Invalid discount code' });
    }

    // Check if active
    if (!discountCode.isActive) {
      return res.status(400).json({ error: 'This discount code is no longer active' });
    }

    // Check date range
    const now = new Date();
    if (discountCode.startDate && now < discountCode.startDate) {
      return res.status(400).json({ error: 'This discount code is not yet valid' });
    }
    if (discountCode.endDate && now > discountCode.endDate) {
      return res.status(400).json({ error: 'This discount code has expired' });
    }

    // Check max redemptions
    if (discountCode.maxRedemptions && discountCode.currentRedemptions >= discountCode.maxRedemptions) {
      return res.status(400).json({ error: 'This discount code has reached its redemption limit' });
    }

    // Check minimum purchase
    if (discountCode.minPurchase && subtotal && subtotal < discountCode.minPurchase) {
      return res.status(400).json({
        error: `Minimum spend of £${discountCode.minPurchase} required for this code`,
      });
    }

    // Check product-specific restrictions
    if (discountCode.applicableProducts.length > 0 && productIds && productIds.length > 0) {
      const applicableIds = discountCode.applicableProducts.map((ap) => ap.productId);
      const hasApplicable = productIds.some((id) => applicableIds.includes(id));
      if (!hasApplicable) {
        return res.status(400).json({ error: 'This discount code does not apply to the items in your cart' });
      }
    }

    // Calculate discount amount if subtotal provided
    let discountAmount = 0;
    if (subtotal) {
      if (discountCode.discountType === 'PERCENTAGE') {
        discountAmount = Math.round((subtotal * discountCode.discountValue) / 100 * 100) / 100;
      } else {
        discountAmount = Math.min(discountCode.discountValue, subtotal);
      }
    }

    console.log('[DiscountCodes] Code validated:', code, { type: discountCode.discountType, value: discountCode.discountValue });

    res.status(200).json({
      valid: true,
      code: discountCode.code,
      discountType: discountCode.discountType,
      discountValue: discountCode.discountValue,
      discountAmount,
      minPurchase: discountCode.minPurchase,
    });
  } catch (error) {
    console.error('[DiscountCodes] Error validating discount code:', error);
    res.status(500).json({ error: 'Failed to validate discount code' });
  }
};

module.exports = {
  getAllDiscountCodes,
  getDiscountCodeById,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
};