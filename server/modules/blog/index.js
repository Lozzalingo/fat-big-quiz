// Blog module - blog posts, comments, votes, tags, blog categories, cover images, YouTube processing
const blogRouter = require('./blog.routes');
const commentRouter = require('./comments.routes');
const tagRouter = require('./tags.routes');
const youtubeRoutes = require('./youtube.routes');

function registerRoutes(app, { adminMiddleware, cachePublic }) {
  app.use('/api/blog', cachePublic(300), blogRouter);
  app.use('/api/blog', adminMiddleware, blogRouter.adminRouter);
  app.use('/api/tags', tagRouter);
  app.use('/api/comments', commentRouter);
  app.use('/api/youtube', youtubeRoutes);
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['storage', 'auth'];
