const express = require('express');
const { validate } = require('../middleware/validate');
const { userCreate, userUpdate } = require('../middleware/schemas');

const router = express.Router();

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

  router.route('/')
  .get(getAllUsers)
  .post(validate(userCreate), createUser);

  router.route('/:id')
  .get(getUser)
  .put(validate(userUpdate), updateUser)
  .delete(deleteUser);

  router.route('/email/:email')
  .get(getUserByEmail);

  // In your routes/users.js file
  router.get("/:id/comments", getUserComments);
  router.get("/:id/votes", getUserVotes);


  module.exports = router;