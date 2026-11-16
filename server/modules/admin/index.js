// Admin module - dashboard, homepage cards, global download files, settings, users,
// campaigns, orders, indexing, images, subscribers
const userRouter = require('./users.routes');
const { publicRouter: userPublicRouter } = require('./users.routes');
const homepageCardsRouter = require('./homepageCards.routes');
const globalDownloadFilesRouter = require('./globalDownloadFiles.routes');
const settingsRouter = require('./settings.routes');
const campaignsRouter = require('./campaigns.routes');
const orderRouter = require('./customer_orders.routes');
const orderProductRouter = require('./customer_order_product.routes');
const imageListRouter = require('./image_list.routes');
const mainImageRouter = require('./mainImages.routes');
const backendImageRouter = require('./backendImages.routes');
const indexingRouter = require('./indexing.routes');
const subscriberRoutes = require('./subscribers.routes');

const { getPublicHomepageCards } = require('./homepageCards.controller');
const { getActiveGlobalFiles } = require('./globalDownloadFiles.controller');

function registerRoutes(app, { adminMiddleware, cachePublic }) {
  // Public subscriber routes (sign-up, unsubscribe)
  app.use('/api/subscribers', subscriberRoutes);

  // Public user routes (accessible to any visitor, no admin auth)
  app.use('/api/users', userPublicRouter);

  // Public homepage cards endpoint (before admin middleware)
  app.get('/api/homepage-cards/public', cachePublic(300), getPublicHomepageCards);

  // Public endpoint for active global files (used by zip download route)
  app.get('/api/global-files/active', getActiveGlobalFiles);

  // Admin-only routes (require admin auth)
  app.use('/api/users', adminMiddleware, userRouter);
  app.use('/api/main-image', adminMiddleware, mainImageRouter);
  app.use('/api/backendimages', adminMiddleware, backendImageRouter);
  app.use('/api/orders', adminMiddleware, orderRouter);
  app.use('/api/order-product', adminMiddleware, orderProductRouter);
  app.use('/api/list-images', adminMiddleware, imageListRouter);
  app.use('/api/settings', adminMiddleware, settingsRouter);
  app.use('/api/homepage-cards', adminMiddleware, homepageCardsRouter);
  app.use('/api/global-files', adminMiddleware, globalDownloadFilesRouter);
  app.use('/api/campaigns', adminMiddleware, campaignsRouter);
  app.use('/api/indexing', adminMiddleware, indexingRouter);
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['auth', 'storage', 'email'];
