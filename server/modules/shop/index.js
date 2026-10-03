// Shop module - products, purchases, discount codes, slugs, search, product images, categories, wishlist, payments callback
const productsRouter = require('./products.routes');
const purchasesRouter = require('./purchases.routes');
const discountCodesRouter = require('./discount-codes.routes');
const slugRouter = require('./slugs.routes');
const searchRouter = require('./search.routes');
const productImagesRouter = require('./productImages.routes');
const categoryRouter = require('./category.routes');
const wishlistRouter = require('./wishlist.routes');
const paymentsCallbackRouter = require('./payments-callback.routes');

function registerRoutes(app, { adminMiddleware, cachePublic }) {
  // Public read routes (storefront)
  app.use('/api/products', cachePublic(300), productsRouter);
  app.use('/api/products', adminMiddleware, productsRouter.adminRouter);
  app.use('/api/categories', cachePublic(300), categoryRouter);
  app.use('/api/search', cachePublic(60), searchRouter);
  app.use('/api/slugs', cachePublic(300), slugRouter);

  // Authenticated user routes (require login but not admin)
  app.use('/api/wishlist', wishlistRouter);
  app.use('/api/purchases', purchasesRouter);

  // Payments callback (server-to-server, no auth)
  app.use('/api/payments', paymentsCallbackRouter);

  // Admin-only routes
  app.use('/api/images', adminMiddleware, productImagesRouter);
  app.use('/api/discount-codes', adminMiddleware, discountCodesRouter);
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['ecommerce', 'payments', 'storage', 'auth'];
