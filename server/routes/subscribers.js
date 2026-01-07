const express = require('express');
const router = express.Router();

const {
  createSubscriber,
  getAllSubscribers,
  getSubscriberByEmail,
  deleteSubscriber,
  updateSubscriberByEmail,
  deleteSubscriberByEmail,
} = require('../controllers/subscribers');

router.route('/')
  .post(createSubscriber)
  .get(getAllSubscribers);

router.route('/:id')
  .delete(deleteSubscriber);

router.route('/:email')
  .get(getSubscriberByEmail)
  .delete(deleteSubscriberByEmail)
  .put(updateSubscriberByEmail)


module.exports = router;