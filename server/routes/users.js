const express = require('express');
const { validate } = require('../middleware/validate');
const { userCreate, userUpdate } = require('../middleware/schemas');

// Admin-only router (list all, create, delete)
const router = express.Router();

// Public router (accessible to any authenticated user)
const publicRouter = express.Router();

const {
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getAllUsers,
    getUserByEmail,
    getUserComments,
    getUserVotes
  } = require('../controllers/users');

  // --- Public routes (no admin auth required) ---
  publicRouter.get('/email/:email', getUserByEmail);
  publicRouter.get('/:id/comments', getUserComments);
  publicRouter.get('/:id/votes', getUserVotes);
  publicRouter.get('/:id', getUser);
  publicRouter.put('/:id', validate(userUpdate), updateUser);

  // --- Admin-only routes ---
  router.route('/')
  .get(getAllUsers)
  .post(validate(userCreate), createUser);

  router.route('/:id')
  .delete(deleteUser);

  module.exports = router;
  module.exports.publicRouter = publicRouter;
