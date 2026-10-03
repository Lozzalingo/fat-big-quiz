// Sales module - sales tracking, Google Merchant
const salesRouter = require('./sales.routes');

function registerRoutes(app, { adminMiddleware }) {
  // Sales tracking (webhook + checkout creation - no admin auth)
  app.use('/api/sales', salesRouter);
  app.use('/api/sales', adminMiddleware, salesRouter.adminRouter);

  // Google Merchant (optional, may fail to load)
  let merchantRouter;
  try {
    merchantRouter = require('./merchant.routes');
  } catch (err) {
    console.warn('[Merchant] Failed to load merchant routes:', err.message);
    merchantRouter = null;
  }

  if (merchantRouter) {
    app.use('/api/merchant', adminMiddleware, merchantRouter);
  } else {
    app.use('/api/merchant', (req, res) => {
      res.status(503).json({ error: 'Google Merchant not configured', configured: false });
    });
  }
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['payments', 'ecommerce'];
