const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/paymentController');

// Stripe webhook endpoint
// IMPORTANT: This must use raw body, not JSON parsed body
router.post(
  '/stripe',
  express.raw({ type: 'application/json' }), // Raw body for signature verification
  handleWebhook
);

module.exports = router;