const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const multer = require('multer');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  deleteAllClients,
  updateClientStatus,
  addClientNote,
  getClientPipeline,
  getClientSummary,
  bulkAssignOwner,
  bulkMoveStatus,
  importClients,
  importClientsBatch,
  exportClients
} = require('../controllers/clientController');

// Configure multer for CSV file uploads (use memory storage to avoid filesystem dependency)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel', // common for CSV on Windows
      'text/plain',
    ];
    const isCsvName = file.originalname?.toLowerCase().endsWith('.csv');
    if (allowedMimes.includes(file.mimetype) || isCsvName) {
      return cb(null, true);
    }
    return cb(new Error('Only CSV files are allowed'));
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Route-level logger for import to confirm request flow before multer
const logImportRoute = (req, res, next) => {
  try {
    console.log('[clients.js] Incoming import request', {
      method: req.method,
      url: req.originalUrl,
      contentType: req.headers['content-type'],
      hasAuth: !!req.headers['authorization']
    });
  } catch (e) {}
  next();
};

// Validation rules
const createClientValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Client name is required')
    .isLength({ max: 200 })
    .withMessage('Client name cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('ownedBy')
    .optional()
    .isEmail()
    .withMessage('Owner must be a valid email address'),
  body('contactStatus')
    .optional()
    .isIn(['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'])
    .withMessage('Invalid contact status'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Please provide a valid phone number'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('facebookPage')
    .optional()
    .isURL()
    .withMessage('Please provide a valid Facebook URL'),
  body('forecastedAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Forecasted amount must be a positive number')
];

const updateClientValidation = [
  ...createClientValidation.filter(rule => 
    !rule.builder.fields.includes('name') // Name is optional for updates
  ),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Client name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Client name cannot exceed 200 characters')
];

const updateStatusValidation = [
  body('status')
    .notEmpty()
    .isIn(['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'])
    .withMessage('Invalid contact status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const addNoteValidation = [
  body('note')
    .trim()
    .notEmpty()
    .withMessage('Note content is required')
    .isLength({ max: 500 })
    .withMessage('Note cannot exceed 500 characters')
];

const listClientsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'name', 'email', 'contactStatus', 'city', 'forecastedAmount'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('contactStatus')
    .optional()
    .isIn(['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'])
    .withMessage('Invalid contact status filter'),
  query('ownedBy')
    .optional()
    .isEmail()
    .withMessage('Owner filter must be a valid email')
];

const bulkAssignValidation = [
  body('clientIds')
    .isArray({ min: 1 })
    .withMessage('Client IDs must be a non-empty array'),
  body('clientIds.*')
    .isMongoId()
    .withMessage('Each client ID must be a valid MongoDB ID'),
  body('newOwnerId')
    .isEmail()
    .withMessage('New owner must be a valid email address')
];

const bulkStatusValidation = [
  body('clientIds')
    .isArray({ min: 1 })
    .withMessage('Client IDs must be a non-empty array'),
  body('clientIds.*')
    .isMongoId()
    .withMessage('Each client ID must be a valid MongoDB ID'),
  body('newStatus')
    .isIn(['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'])
    .withMessage('Invalid contact status'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

const clientIdValidation = [
  param('id')
    .isString()
    .notEmpty()
    .withMessage('Invalid client ID')
];

// Routes - All routes require authentication

// GET /api/clients - List all clients with pagination, search, and filtering
router.get(
  '/',
  authMiddleware,
  listClientsValidation,
  listClients
);

// GET /api/clients/pipeline - Get clients grouped by contact status
router.get(
  '/pipeline',
  authMiddleware,
  getClientPipeline
);

// GET /api/clients/summary - Get overall client summaries for footer/header
router.get(
  '/summary',
  authMiddleware,
  getClientSummary
);

// GET /api/clients/export - Export clients to CSV
router.get(
  '/export',
  authMiddleware,
  authorize('admin', 'manager'),
  exportClients
);

// GET /api/clients/:id - Get single client
router.get(
  '/:id',
  authMiddleware,
  clientIdValidation,
  getClient
);

// POST /api/clients - Create new client
router.post(
  '/',
  authMiddleware,
  createClientValidation,
  createClient
);

// POST /api/clients/import - Import clients from CSV
router.post(
  '/import',
  authMiddleware,
  authorize('admin', 'manager'),
  logImportRoute,
  upload.single('file'),
  importClients
);

// POST /api/clients/import/batch - High-throughput JSON batch import
router.post(
  '/import/batch',
  authMiddleware,
  authorize('admin', 'manager'),
  importClientsBatch
);

// POST /api/clients/bulk-assign - Bulk assign owner
router.post(
  '/bulk-assign',
  authMiddleware,
  authorize('admin', 'manager'),
  bulkAssignValidation,
  bulkAssignOwner
);

// POST /api/clients/bulk-status - Bulk move status
router.post(
  '/bulk-status',
  authMiddleware,
  authorize('admin', 'manager'),
  bulkStatusValidation,
  bulkMoveStatus
);

// PUT /api/clients/:id - Update client
router.put(
  '/:id',
  authMiddleware,
  clientIdValidation,
  updateClientValidation,
  updateClient
);

// PUT /api/clients/:id/status - Update client contact status
router.put(
  '/:id/status',
  authMiddleware,
  clientIdValidation,
  updateStatusValidation,
  updateClientStatus
);

// POST /api/clients/:id/notes - Add note to client
router.post(
  '/:id/notes',
  authMiddleware,
  clientIdValidation,
  addNoteValidation,
  addClientNote
);

// DELETE /api/clients/all - Delete ALL clients (Dangerous)
// IMPORTANT: must be defined BEFORE '/:id' to avoid route collision
router.delete(
  '/all',
  authMiddleware,
  authorize('admin', 'manager'),
  deleteAllClients
);

// DELETE /api/clients/:id - Delete client
router.delete(
  '/:id',
  authMiddleware,
  authorize('admin', 'manager'),
  clientIdValidation,
  deleteClient
);

module.exports = router;