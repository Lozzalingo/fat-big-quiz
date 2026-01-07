const express = require('express');
const router = express.Router();
const discountCodesController = require('../controllers/discount-codes');

// Get all discount codes
router.get('/', discountCodesController.getAllDiscountCodes);

// Get a single discount code by ID
router.get('/:id', discountCodesController.getDiscountCodeById);

// Create a new discount code
router.post('/', discountCodesController.createDiscountCode);

// Update a discount code
router.put('/:id', discountCodesController.updateDiscountCode);

// Delete a discount code
router.delete('/:id', discountCodesController.deleteDiscountCode);

module.exports = router;