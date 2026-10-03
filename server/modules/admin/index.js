// Admin module - dashboard, homepage cards, global download files, settings, users,
// campaigns, orders, visitors, indexing, images, subscribers
const userRouter = require('./users.routes');
const { publicRouter: userPublicRouter } = require('./users.routes');
const homepageCardsRouter = require('./homepageCards.routes');
const globalDownloadFilesRouter = require('./globalDownloadFiles.routes');
const settingsRouter = require('./settings.routes');
const campaignsRouter = require('./campaigns.routes');
const orderRouter = require('./customer_orders.routes');
const orderProductRouter = require('./customer_order_product.routes');
const visitorRouter = require('./visitors.routes');
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

  // Visitor tracking POSTs are public (frontend calls these), analytics GETs are admin-only
  app.use('/api/visitors', (req, res, next) => {
    const publicPosts = ['/track', '/update', '/event'];
    if (req.method === 'POST' && publicPosts.includes(req.path)) {
      return visitorRouter(req, res, next);
    }
    next();
  });

  // Admin-only routes (require admin auth)
  app.use('/api/users', adminMiddleware, userRouter);
  app.use('/api/main-image', adminMiddleware, mainImageRouter);
  app.use('/api/backendimages', adminMiddleware, backendImageRouter);
  app.use('/api/orders', adminMiddleware, orderRouter);
  app.use('/api/order-product', adminMiddleware, orderProductRouter);
  app.use('/api/list-images', adminMiddleware, imageListRouter);
  app.use('/api/settings', adminMiddleware, settingsRouter);
  app.use('/api/visitors', adminMiddleware, visitorRouter);
  app.use('/api/homepage-cards', adminMiddleware, homepageCardsRouter);
  app.use('/api/global-files', adminMiddleware, globalDownloadFilesRouter);
  app.use('/api/campaigns', adminMiddleware, campaignsRouter);
  app.use('/api/indexing', adminMiddleware, indexingRouter);
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['auth', 'storage', 'email', 'analytics'];
