const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');
const {
  listActivities,
  getClientActivities,
  createActivity,
  getActivityStats
} = require('../controllers/activityController');

// Validation rules
const createActivityValidation = [
  body('clientId')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid client ID is required'),
  body('type')
    .notEmpty()
    .isIn(['created', 'status_changed', 'note_added', 'email_sent', 'call_made', 'meeting_scheduled'])
    .withMessage('Invalid activity type'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Activity description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const listActivitiesValidation = [
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
    .isIn(['createdAt', 'type'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  query('clientId')
    .optional()
    .isMongoId()
    .withMessage('Invalid client ID'),
  query('userId')
    .optional()
    .isEmail()
    .withMessage('User ID must be a valid email'),
  query('type')
    .optional()
    .isIn(['created', 'status_changed', 'note_added', 'email_sent', 'call_made', 'meeting_scheduled'])
    .withMessage('Invalid activity type'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

const clientActivitiesValidation = [
  param('clientId')
    .isMongoId()
    .withMessage('Invalid client ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page size must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['created', 'status_changed', 'note_added', 'email_sent', 'call_made', 'meeting_scheduled'])
    .withMessage('Invalid activity type')
];

const activityStatsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('userId')
    .optional()
    .isEmail()
    .withMessage('User ID must be a valid email')
];

// Routes - All routes require authentication

// GET /api/activities - List all activities with filtering
router.get(
  '/',
  authMiddleware,
  listActivitiesValidation,
  listActivities
);

// GET /api/activities/stats - Get activity statistics
router.get(
  '/stats',
  authMiddleware,
  activityStatsValidation,
  getActivityStats
);

// GET /api/activities/client/:clientId - Get activities for a specific client
router.get(
  '/client/:clientId',
  authMiddleware,
  clientActivitiesValidation,
  getClientActivities
);

// POST /api/activities - Create new activity
router.post(
  '/',
  authMiddleware,
  createActivityValidation,
  createActivity
);

module.exports = router;