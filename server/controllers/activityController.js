const Activity = require('../models/Activity');
const Client = require('../models/Client');
const { validationResult } = require('express-validator');

// List all activities with filtering
const listActivities = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      clientId,
      userId,
      type,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};
    
    if (clientId) {
      query.clientId = clientId;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const limit = parseInt(pageSize);
    const skip = (parseInt(page) - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    // Execute query with population
    const [activities, totalCount] = await Promise.all([
      Activity.find(query)
        .populate('userId', 'name email role')
        .populate('clientId', 'name email contactStatus')
        .sort(sort)
        .limit(limit)
        .skip(skip),
      Activity.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      activities,
      pagination: {
        currentPage: parseInt(page),
        pageSize: limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('List activities error:', error);
    res.status(500).json({ 
      message: 'Error fetching activities', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get activities for a specific client
const getClientActivities = async (req, res) => {
  try {
    const { clientId } = req.params;
    const {
      page = 1,
      pageSize = 50,
      type
    } = req.query;

    // Verify client exists
    const clientExists = await Client.exists({ _id: clientId });
    if (!clientExists) {
      return res.status(404).json({ 
        message: 'Client not found' 
      });
    }

    // Build query
    const query = { clientId };
    
    if (type) {
      query.type = type;
    }

    // Calculate pagination
    const limit = parseInt(pageSize);
    const skip = (parseInt(page) - 1) * limit;

    // Execute query with population
    const [activities, totalCount, activitySummary] = await Promise.all([
      Activity.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      Activity.countDocuments(query),
      Activity.getClientActivitySummary(clientId)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      activities,
      summary: activitySummary,
      pagination: {
        currentPage: parseInt(page),
        pageSize: limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Get client activities error:', error);
    res.status(500).json({ 
      message: 'Error fetching client activities', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Create new activity
const createActivity = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { clientId, type, description, metadata } = req.body;

    // Verify client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ 
        message: 'Client not found' 
      });
    }

    // Create activity using the static method for validation
    const activity = await Activity.createActivity({
      clientId,
      userId: req.userId,
      type,
      description,
      metadata: metadata || {}
    });

    // Populate user details
    await activity.populate('userId', 'name email role');

    // Update client's interaction count if applicable
    if (['email_sent', 'call_made', 'meeting_scheduled'].includes(type)) {
      await client.incrementInteraction();
    }

    res.status(201).json({
      message: 'Activity created successfully',
      activity
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ 
      message: 'Error creating activity', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get activity statistics for reporting
const getActivityStats = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      userId
    } = req.query;

    const stats = await Activity.getActivityStats(
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
      userId
    );

    res.json({
      stats,
      period: {
        startDate: startDate || 'all-time',
        endDate: endDate || 'current',
        userId: userId || 'all-users'
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ 
      message: 'Error fetching activity statistics', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

module.exports = {
  listActivities,
  getClientActivities,
  createActivity,
  getActivityStats
};