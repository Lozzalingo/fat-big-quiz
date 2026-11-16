const express = require('express');
const router = express.Router();
const publicRouter = express.Router();
const discountCodesController = require('./discount-codes.controller');

// Public route (no admin auth required)
publicRouter.post('/validate', discountCodesController.validateDiscountCode);

// Admin routes (require admin middleware)
router.get('/', discountCodesController.getAllDiscountCodes);
router.get('/:id', discountCodesController.getDiscountCodeById);
router.post('/', discountCodesController.createDiscountCode);
router.put('/:id', discountCodesController.updateDiscountCode);
router.delete('/:id', discountCodesController.deleteDiscountCode);

module.exports = router;
module.exports.publicRouter = publicRouter;