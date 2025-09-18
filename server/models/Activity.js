const mongoose = require('mongoose');

// Activity Schema for tracking all client interactions and events
const activitySchema = new mongoose.Schema({
  // Reference to the client this activity belongs to
  clientId: {
    type: String,
    ref: 'Client',
    required: [true, 'Client ID is required for activity'],
    index: true // Index for faster queries by client
  },
  
  // Reference to the user who performed the activity (using email as _id)
  userId: {
    type: String,
    ref: 'User',
    required: [true, 'User ID is required for activity'],
    index: true // Index for faster queries by user
  },
  
  // Type of activity performed
  type: {
    type: String,
    required: [true, 'Activity type is required'],
    enum: {
      values: [
        'created',           // Client was created
        'status_changed',    // Client status was changed
        'note_added',        // Note was added to client
        'email_sent',        // Email was sent to client
        'call_made',         // Phone call was made to client
        'meeting_scheduled'  // Meeting was scheduled with client
      ],
      message: 'Invalid activity type'
    },
    index: true // Index for filtering by activity type
  },
  
  // Human-readable description of the activity
  description: {
    type: String,
    required: [true, 'Activity description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Flexible metadata field for storing additional activity-specific data
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: { 
    createdAt: true,  // Track when the activity occurred
    updatedAt: false  // Activities are immutable, so no need for updatedAt
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for complex queries
activitySchema.index({ clientId: 1, createdAt: -1 }); // Recent activities for a client
activitySchema.index({ userId: 1, createdAt: -1 });   // Recent activities by a user
activitySchema.index({ type: 1, createdAt: -1 });     // Recent activities by type
activitySchema.index({ clientId: 1, type: 1, createdAt: -1 }); // Specific activity types for a client

// Virtual to populate user details
activitySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual to populate client details
activitySchema.virtual('client', {
  ref: 'Client',
  localField: 'clientId',
  foreignField: '_id',
  justOne: true
});

// Virtual for formatted date
activitySchema.virtual('formattedDate').get(function() {
  return this.createdAt ? this.createdAt.toLocaleString() : '';
});

// Virtual for activity age in days
activitySchema.virtual('ageInDays').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Static method to create a new activity with validation
activitySchema.statics.createActivity = async function(activityData) {
  // Validate that the client exists
  const Client = mongoose.model('Client');
  const clientExists = await Client.exists({ _id: activityData.clientId });
  if (!clientExists) {
    throw new Error('Client not found');
  }
  
  // Validate that the user exists
  const User = mongoose.model('User');
  const userExists = await User.exists({ _id: activityData.userId });
  if (!userExists) {
    throw new Error('User not found');
  }
  
  // Create and return the activity
  return this.create(activityData);
};

// Static method to log a status change activity
activitySchema.statics.logStatusChange = async function(clientId, userId, oldStatus, newStatus, notes = '') {
  return this.createActivity({
    clientId,
    userId,
    type: 'status_changed',
    description: `Status changed from ${oldStatus} to ${newStatus}`,
    metadata: {
      oldStatus,
      newStatus,
      notes
    }
  });
};

// Static method to log an email sent activity
activitySchema.statics.logEmailSent = async function(clientId, userId, subject, recipientEmail) {
  return this.createActivity({
    clientId,
    userId,
    type: 'email_sent',
    description: `Email sent: "${subject}"`,
    metadata: {
      subject,
      recipientEmail,
      sentAt: new Date()
    }
  });
};

// Static method to log a call made activity
activitySchema.statics.logCallMade = async function(clientId, userId, duration, outcome) {
  return this.createActivity({
    clientId,
    userId,
    type: 'call_made',
    description: `Call made (${duration} minutes)`,
    metadata: {
      duration,
      outcome,
      calledAt: new Date()
    }
  });
};

// Static method to log a meeting scheduled activity
activitySchema.statics.logMeetingScheduled = async function(clientId, userId, meetingDate, location, agenda) {
  return this.createActivity({
    clientId,
    userId,
    type: 'meeting_scheduled',
    description: `Meeting scheduled for ${new Date(meetingDate).toLocaleDateString()}`,
    metadata: {
      meetingDate,
      location,
      agenda,
      scheduledAt: new Date()
    }
  });
};

// Static method to log a note added activity
activitySchema.statics.logNoteAdded = async function(clientId, userId, noteContent) {
  return this.createActivity({
    clientId,
    userId,
    type: 'note_added',
    description: noteContent.substring(0, 100) + (noteContent.length > 100 ? '...' : ''),
    metadata: {
      fullNote: noteContent,
      addedAt: new Date()
    }
  });
};

// Static method to log client creation activity
activitySchema.statics.logClientCreated = async function(clientId, userId, clientName) {
  return this.createActivity({
    clientId,
    userId,
    type: 'created',
    description: `Client "${clientName}" was created`,
    metadata: {
      clientName,
      createdAt: new Date()
    }
  });
};

// Static method to get recent activities for a client
activitySchema.statics.getClientActivities = function(clientId, limit = 50) {
  return this.find({ clientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email role');
};

// Static method to get recent activities by a user
activitySchema.statics.getUserActivities = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('clientId', 'name email contactStatus');
};

// Static method to get activity summary for a client
activitySchema.statics.getClientActivitySummary = async function(clientId) {
  const activities = await this.aggregate([
    { $match: { clientId: clientId } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        lastActivity: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        lastActivity: 1,
        _id: 0
      }
    }
  ]);
  
  return activities;
};

// Static method to get activity timeline for multiple clients
activitySchema.statics.getActivitiesTimeline = function(clientIds, startDate, endDate) {
  const query = {
    clientId: { $in: clientIds }
  };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .populate('userId', 'name email')
    .populate('clientId', 'name contactStatus');
};

// Static method to get activity statistics for reporting
activitySchema.statics.getActivityStats = async function(startDate, endDate, userId = null) {
  const matchQuery = {};
  
  if (startDate || endDate) {
    matchQuery.createdAt = {};
    if (startDate) matchQuery.createdAt.$gte = startDate;
    if (endDate) matchQuery.createdAt.$lte = endDate;
  }
  
  if (userId) {
    matchQuery.userId = userId;
  }
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          type: '$type',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.type',
        dailyCounts: {
          $push: {
            date: '$_id.date',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' }
      }
    },
    {
      $project: {
        type: '$_id',
        dailyCounts: 1,
        totalCount: 1,
        _id: 0
      }
    }
  ]);
  
  return stats;
};

// Instance method to format activity for display
activitySchema.methods.formatForDisplay = function() {
  const typeLabels = {
    'created': '✨ Created',
    'status_changed': '🔄 Status Changed',
    'note_added': '📝 Note Added',
    'email_sent': '📧 Email Sent',
    'call_made': '📞 Call Made',
    'meeting_scheduled': '📅 Meeting Scheduled'
  };
  
  return {
    icon: typeLabels[this.type] || this.type,
    description: this.description,
    timestamp: this.createdAt,
    metadata: this.metadata
  };
};

// Remove unnecessary fields when converting to JSON
activitySchema.methods.toJSON = function() {
  const activity = this.toObject();
  delete activity.__v;
  return activity;
};

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;