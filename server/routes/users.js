const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const multer = require('multer');
const { authMiddleware, authorize } = require('../middleware/auth');
const {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  importUsers,
  exportUsers
} = require('../controllers/userController');

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Validation rules
const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Role must be admin, manager, or employee'),
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
  body('phone')
    .optional()
    .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
    .withMessage('Please provide a valid phone number'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Hourly rate must be between 0 and 10000'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive')
];

const listUsersValidation = [
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
    .isIn(['createdAt', 'name', 'email', 'role', 'department', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('role')
    .optional()
    .isIn(['admin', 'manager', 'employee'])
    .withMessage('Invalid role filter'),
  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Invalid status filter')
];

const userIdValidation = [
  param('id')
    .isEmail()
    .withMessage('User ID must be a valid email address')
];

// Routes - All routes require authentication
// Admin-only routes are marked with authorize('admin')

// GET /api/users - List all users with pagination and filtering
router.get(
  '/',
  authMiddleware,
  authorize('admin', 'manager'),
  listUsersValidation,
  listUsers
);

// GET /api/users/:id - Get single user
router.get(
  '/:id',
  authMiddleware,
  authorize('admin', 'manager'),
  userIdValidation,
  getUser
);

// PUT /api/users/:id - Update user (admin only)
router.put(
  '/:id',
  authMiddleware,
  authorize('admin'),
  userIdValidation,
  updateUserValidation,
  updateUser
);

// DELETE /api/users/:id - Delete user (soft delete - admin only)
router.delete(
  '/:id',
  authMiddleware,
  authorize('admin'),
  userIdValidation,
  deleteUser
);

// POST /api/users/import - Import users from CSV (admin only)
router.post(
  '/import',
  authMiddleware,
  authorize('admin'),
  upload.single('file'),
  importUsers
);

// GET /api/users/export - Export users to CSV
router.get(
  '/export',
  authMiddleware,
  authorize('admin', 'manager'),
  exportUsers
);

module.exports = router;