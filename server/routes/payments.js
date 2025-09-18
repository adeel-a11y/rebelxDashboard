const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  // New methods
  addPaymentMethod,
  listPaymentMethods,
  setDefaultPaymentMethod,
  removePaymentMethod,
  createPaymentIntent,
  confirmPaymentIntent,
  getPaymentHistory,
  createSetupIntent,
  
  // Legacy methods (for backward compatibility)
  tokenizePaymentMethod,
  updateClientPaymentMethod,
  removeClientPaymentMethod
} = require('../controllers/paymentController');

// Validation rules
const addPaymentMethodValidation = [
  body('clientId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid client ID is required'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required'),
  body('isDefault')
    .optional()
    .isBoolean()
    .withMessage('isDefault must be a boolean')
];

const listPaymentMethodsValidation = [
  param('clientId')
    .isMongoId()
    .withMessage('Invalid client ID')
];

const setDefaultPaymentMethodValidation = [
  param('clientId')
    .isMongoId()
    .withMessage('Invalid client ID'),
  param('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
];

const removePaymentMethodValidation = [
  param('clientId')
    .isMongoId()
    .withMessage('Invalid client ID'),
  param('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
];

const createPaymentIntentValidation = [
  body('clientId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid client ID is required'),
  body('amount')
    .notEmpty()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['usd', 'eur', 'gbp', 'cad', 'aud'])
    .withMessage('Invalid currency code'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('paymentMethodId')
    .optional()
    .notEmpty()
    .withMessage('Payment method ID cannot be empty'),
  body('savePaymentMethod')
    .optional()
    .isBoolean()
    .withMessage('savePaymentMethod must be a boolean'),
  body('confirm')
    .optional()
    .isBoolean()
    .withMessage('confirm must be a boolean')
];

const confirmPaymentIntentValidation = [
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment intent ID is required'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method ID is required')
];

const getPaymentHistoryValidation = [
  param('clientId')
    .isMongoId()
    .withMessage('Invalid client ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const createSetupIntentValidation = [
  body('clientId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid client ID is required')
];

// Legacy validation rules (for backward compatibility)
const tokenizePaymentValidation = [
  body('stripeToken')
    .notEmpty()
    .withMessage('Stripe token is required'),
  body('nameOnCard')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name on card cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name on card cannot exceed 100 characters'),
  body('billingZip')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Billing zip cannot exceed 20 characters'),
  body('clientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid client ID')
];

const updatePaymentMethodValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid client ID'),
  body('paymentMethodId')
    .optional()
    .notEmpty()
    .withMessage('Payment method ID cannot be empty'),
  body('stripeToken')
    .optional()
    .notEmpty()
    .withMessage('Stripe token cannot be empty'),
  body('last4')
    .optional()
    .matches(/^\d{4}$/)
    .withMessage('Last 4 must be exactly 4 digits'),
  body('brand')
    .optional()
    .isIn(['Visa', 'Mastercard', 'American Express', 'Discover', 'Other'])
    .withMessage('Invalid card brand'),
  body('expMonth')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Expiry month must be between 1 and 12'),
  body('expYear')
    .optional()
    .isInt({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 })
    .withMessage('Invalid expiry year'),
  body('nameOnCard')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Name on card cannot exceed 100 characters'),
  body('billingZip')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Billing zip cannot exceed 20 characters')
];

const clientIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid client ID')
];

// Custom validation middleware to ensure at least one payment identifier is provided
const requirePaymentIdentifier = (req, res, next) => {
  if (!req.body.paymentMethodId && !req.body.stripeToken) {
    return res.status(400).json({
      message: 'Either paymentMethodId or stripeToken is required'
    });
  }
  next();
};

// ===== NEW PAYMENT VAULT ROUTES =====

// POST /api/payments/methods - Add a payment method to a client
router.post(
  '/methods',
  authMiddleware,
  authorize('admin', 'manager'),
  addPaymentMethodValidation,
  addPaymentMethod
);

// GET /api/payments/clients/:clientId/methods - List payment methods for a client
router.get(
  '/clients/:clientId/methods',
  authMiddleware,
  listPaymentMethodsValidation,
  listPaymentMethods
);

// PUT /api/payments/clients/:clientId/methods/:paymentMethodId/default - Set default payment method
router.put(
  '/clients/:clientId/methods/:paymentMethodId/default',
  authMiddleware,
  authorize('admin', 'manager'),
  setDefaultPaymentMethodValidation,
  setDefaultPaymentMethod
);

// DELETE /api/payments/clients/:clientId/methods/:paymentMethodId - Remove a payment method
router.delete(
  '/clients/:clientId/methods/:paymentMethodId',
  authMiddleware,
  authorize('admin', 'manager'),
  removePaymentMethodValidation,
  removePaymentMethod
);

// POST /api/payments/intent - Create payment intent
router.post(
  '/intent',
  authMiddleware,
  authorize('admin', 'manager'),
  createPaymentIntentValidation,
  createPaymentIntent
);

// POST /api/payments/intent/confirm - Confirm payment intent
router.post(
  '/intent/confirm',
  authMiddleware,
  authorize('admin', 'manager'),
  confirmPaymentIntentValidation,
  confirmPaymentIntent
);

// GET /api/payments/clients/:clientId/history - Get payment history
router.get(
  '/clients/:clientId/history',
  authMiddleware,
  getPaymentHistoryValidation,
  getPaymentHistory
);

// POST /api/payments/setup-intent - Create setup intent for saving payment methods
router.post(
  '/setup-intent',
  authMiddleware,
  createSetupIntentValidation,
  createSetupIntent
);

// ===== LEGACY ROUTES (for backward compatibility) =====

// POST /api/payments/tokenize - Legacy tokenize payment method
router.post(
  '/tokenize',
  authMiddleware,
  tokenizePaymentValidation,
  tokenizePaymentMethod
);

// PUT /api/payments/clients/:id/payment-method - Legacy update client payment method
router.put(
  '/clients/:id/payment-method',
  authMiddleware,
  authorize('admin', 'manager'),
  updatePaymentMethodValidation,
  requirePaymentIdentifier,
  updateClientPaymentMethod
);

// DELETE /api/payments/clients/:id/payment-method - Legacy remove client payment method
router.delete(
  '/clients/:id/payment-method',
  authMiddleware,
  authorize('admin', 'manager'),
  clientIdValidation,
  removeClientPaymentMethod
);

module.exports = router;