// Quiz Database module - quiz questions, formats
const quizDatabaseRouter = require('./quizDatabase.routes');
const quizFormatsRouter = require('./quizFormats.routes');

function registerRoutes(app, { adminMiddleware }) {
  app.use('/api/quiz-formats', quizFormatsRouter);
  app.use('/api/quiz-database', adminMiddleware, quizDatabaseRouter);
}

module.exports.registerRoutes = registerRoutes;
module.exports.services = ['auth', 'storage'];
