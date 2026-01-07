const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all discount codes
const getAllDiscountCodes = async (req, res) => {
  try {
    const discountCodes = await prisma.discountCode.findMany({
      select: {
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
      },
    });
    res.status(200).json(discountCodes);
  } catch (error) {
    console.error('Error fetching discount codes:', error);
    res.status(500).json({ error: 'Failed to fetch discount codes' });
  }
};

// Get a single discount code by ID
const getDiscountCodeById = async (req, res) => {
  const { id } = req.params;
  try {
    const discountCode = await prisma.discountCode.findUnique({
      where: { id },
      select: {
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
      },
    });
    if (!discountCode) {
      return res.status(404).json({ error: 'Discount code not found' });
    }
    res.status(200).json(discountCode);
  } catch (error) {
    console.error('Error fetching discount code:', error);
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
      select: {
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
      },
    });
    res.status(201).json(discountCode);
  } catch (error) {
    console.error('Error creating discount code:', error);
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
      select: {
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
      },
    });
    res.status(200).json(discountCode);
  } catch (error) {
    console.error('Error updating discount code:', error);
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
    console.error('Error deleting discount code:', error);
    res.status(500).json({ error: 'Failed to delete discount code' });
  }
};

module.exports = {
  getAllDiscountCodes,
  getDiscountCodeById,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
};