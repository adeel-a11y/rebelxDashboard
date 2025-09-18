const mongoose = require('mongoose');

// Client Schema with comprehensive CRM fields
const clientSchema = new mongoose.Schema({
  // Use String IDs so we can assign CSV Client_id directly
  _id: {
    type: String,
    required: true,
    trim: true
  },
  // Legacy/External Identifier (from CSV like Client_id)
  externalId: {
    type: String,
    trim: true,
    index: true
  },
  // Basic Information
  name: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true,
    maxlength: [200, 'Client name cannot exceed 200 characters'],
    index: true // Index for faster searches
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  // Plain-text owner label from CSV (distinct from ownedBy user reference)
  owner: {
    type: String,
    trim: true,
    maxlength: [150, 'Owner cannot exceed 150 characters']
  },
  ownedBy: {
    type: String, // References User by email (_id)
    ref: 'User',
    index: true
  },
  
  // Contact Status and Type
  contactStatus: {
    type: String,
    enum: {
      values: ['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration'],
      message: 'Invalid contact status'
    },
    default: 'New Prospect',
    index: true // Index for filtering by status
  },
  contactType: {
    type: String,
    trim: true,
    maxlength: [50, 'Contact type cannot exceed 50 characters']
  },
  companyType: {
    type: String,
    trim: true,
    maxlength: [100, 'Company type cannot exceed 100 characters']
  },
  
  // Contact Information
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    index: true // Index for email searches
  },
  
  // Address Information
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters']
  },
  city: {
    type: String,
    trim: true,
    maxlength: [100, 'City cannot exceed 100 characters'],
    index: true // Index for location-based queries
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  postalCode: {
    type: String,
    trim: true,
    maxlength: [20, 'Postal code cannot exceed 20 characters']
  },
  
  // Online Presence
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please provide a valid URL']
  },
  facebookPage: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please provide a valid Facebook URL']
  },
  
  // Business Information
  industry: {
    type: String,
    trim: true,
    maxlength: [100, 'Industry cannot exceed 100 characters'],
    index: true // Index for industry filtering
  },
  forecastedAmount: {
    type: Number,
    default: 0,
    min: [0, 'Forecasted amount cannot be negative']
  },
  interactionCount: {
    type: Number,
    default: 0,
    min: [0, 'Interaction count cannot be negative']
  },
  
  // Additional Information
  profileImage: {
    type: String, // URL to client's profile image
    match: [/^https?:\/\/.+/, 'Please provide a valid URL for the profile image']
  },
  folderLink: {
    type: String,
    trim: true,
    maxlength: [500, 'Folder link cannot exceed 500 characters']
  },
  // Raw CSV createdAt string for display/traceability
  createdAtText: {
    type: String,
    trim: true,
    maxlength: [50, 'CreatedAt text cannot exceed 50 characters']
  },
  // Legacy payment text fields (non-PCI sensitive): store only safe representations
  nameCC: {
    type: String,
    trim: true,
    maxlength: [150, 'NameCC cannot exceed 150 characters']
  },
  maskedCCLast4: {
    type: String,
    trim: true,
    match: [/^\d{0,4}$/], // store only last4 digits
  },
  expirationDateText: {
    type: String,
    trim: true,
    maxlength: [20, 'ExpirationDate text cannot exceed 20 characters']
  },
  ccNumberText: {
    type: String,
    trim: true,
    maxlength: [30, 'CCNumber text cannot exceed 30 characters']
  },
  securityCodeText: {
    type: String,
    trim: true,
    maxlength: [10, 'SecurityCode text cannot exceed 10 characters']
  },
  zipCodeText: {
    type: String,
    trim: true,
    maxlength: [20, 'ZipCode text cannot exceed 20 characters']
  },
  lastNote: {
    type: String,
    trim: true,
    maxlength: [500, 'Last note cannot exceed 500 characters']
  },
  projectedCloseDate: {
    type: Date
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: [200, 'Full name cannot exceed 200 characters']
  },
  
  // Payment Information - Stripe Payment Vault
  // SECURITY NOTE: Never store raw credit card numbers or CVV codes
  // Only store tokenized payment data from Stripe
  paymentMethod: {
    stripeCustomerId: {
      type: String, // Stripe customer ID
      select: false // Don't return by default for security
    },
    paymentMethods: [{
      id: {
        type: String, // Stripe payment method ID
        required: true
      },
      brand: {
        type: String, // Card brand (e.g., 'visa', 'mastercard')
        required: true
      },
      last4: {
        type: String, // Last 4 digits of card only
        required: true,
        match: [/^\d{4}$/, 'Last 4 must be exactly 4 digits']
      },
      expMonth: {
        type: Number,
        required: true,
        min: [1, 'Expiry month must be between 1 and 12'],
        max: [12, 'Expiry month must be between 1 and 12']
      },
      expYear: {
        type: Number,
        required: true,
        min: [2020, 'Invalid expiry year']
      },
      nameOnCard: {
        type: String,
        trim: true,
        maxlength: [100, 'Name on card cannot exceed 100 characters']
      },
      billingZip: {
        type: String,
        trim: true,
        maxlength: [20, 'Billing zip cannot exceed 20 characters']
      },
      isDefault: {
        type: Boolean,
        default: false
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Shipping and Payment Terms
  defaultShippingTerms: {
    type: String,
    trim: true,
    maxlength: [200, 'Shipping terms cannot exceed 200 characters']
  },
  defaultPaymentMethod: {
    type: String,
    trim: true,
    maxlength: [100, 'Payment method cannot exceed 100 characters']
  },
  
  // Status History Tracking
  statusHistory: [{
    status: {
      type: String,
      required: true,
      enum: ['Sampling', 'New Prospect', 'Uncategorized', 'Closed lost', 'Initial Contact', 'Closed won', 'Committed', 'Consideration']
    },
    changedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    changedBy: {
      type: String, // References User by email
      ref: 'User',
      required: true
    },
    notes: {
      type: String,
      maxlength: [500, 'Status change notes cannot exceed 500 characters']
    }
  }]
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for complex queries
clientSchema.index({ contactStatus: 1, industry: 1 });
clientSchema.index({ ownedBy: 1, contactStatus: 1 });
clientSchema.index({ city: 1, state: 1 });
clientSchema.index({ createdAt: -1 });

// Virtual for full address
clientSchema.virtual('fullAddress').get(function() {
  const parts = [];
  if (this.address) parts.push(this.address);
  if (this.city) parts.push(this.city);
  if (this.state) parts.push(this.state);
  if (this.postalCode) parts.push(this.postalCode);
  return parts.join(', ');
});

// Virtual to check if payment method exists
clientSchema.virtual('hasPaymentMethod').get(function() {
  return !!(this.paymentMethod && this.paymentMethod.paymentMethods && this.paymentMethod.paymentMethods.length > 0);
});

// Virtual to get default payment method
clientSchema.virtual('computedDefaultPaymentMethod').get(function() {
  if (!this.paymentMethod || !this.paymentMethod.paymentMethods) {
    return null;
  }
  return this.paymentMethod.paymentMethods.find(pm => pm.isDefault) || this.paymentMethod.paymentMethods[0];
});

// Virtual to check if any card is expiring soon (within 3 months)
clientSchema.virtual('hasExpiringCards').get(function() {
  if (!this.paymentMethod || !this.paymentMethod.paymentMethods) {
    return false;
  }
  
  const today = new Date();
  const threeMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 3);
  
  return this.paymentMethod.paymentMethods.some(pm => {
    const expiry = new Date(pm.expYear, pm.expMonth - 1);
    return expiry <= threeMonthsFromNow;
  });
});

// Pre-save hook to track status changes
clientSchema.pre('save', function(next) {
  // If contactStatus has changed, add to history
  if (this.isModified('contactStatus') && !this.isNew) {
    // This will need to be handled in the controller to include the user who made the change
    // as we don't have access to the request context here
  }
  
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  next();
});

// Instance method to add status change to history
clientSchema.methods.addStatusChange = function(newStatus, changedBy, notes = '') {
  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: changedBy,
    notes: notes
  });
  this.contactStatus = newStatus;
};

// Instance method to increment interaction count
clientSchema.methods.incrementInteraction = async function() {
  this.interactionCount += 1;
  await this.save();
};

// Instance method to add a payment method
clientSchema.methods.addPaymentMethod = async function(paymentMethodData) {
  // SECURITY: Only accept tokenized payment data, never raw card numbers
  if (paymentMethodData.cardNumber || paymentMethodData.cvv) {
    throw new Error('Cannot store raw card data. Please use tokenized payment information.');
  }
  
  if (!this.paymentMethod) {
    this.paymentMethod = {
      paymentMethods: []
    };
  }
  
  // If this is the first payment method or marked as default, set it as default
  if (this.paymentMethod.paymentMethods.length === 0 || paymentMethodData.isDefault) {
    // Set all other methods as non-default
    this.paymentMethod.paymentMethods.forEach(pm => {
      pm.isDefault = false;
    });
    paymentMethodData.isDefault = true;
  }
  
  this.paymentMethod.paymentMethods.push({
    id: paymentMethodData.id,
    brand: paymentMethodData.brand,
    last4: paymentMethodData.last4,
    expMonth: paymentMethodData.expMonth,
    expYear: paymentMethodData.expYear,
    nameOnCard: paymentMethodData.nameOnCard,
    billingZip: paymentMethodData.billingZip,
    isDefault: paymentMethodData.isDefault || false,
    createdAt: new Date()
  });
  
  await this.save();
};

// Instance method to remove a payment method
clientSchema.methods.removePaymentMethod = async function(paymentMethodId) {
  if (!this.paymentMethod || !this.paymentMethod.paymentMethods) {
    return;
  }
  
  const index = this.paymentMethod.paymentMethods.findIndex(pm => pm.id === paymentMethodId);
  if (index === -1) {
    throw new Error('Payment method not found');
  }
  
  const wasDefault = this.paymentMethod.paymentMethods[index].isDefault;
  this.paymentMethod.paymentMethods.splice(index, 1);
  
  // If removed method was default and there are other methods, set first as default
  if (wasDefault && this.paymentMethod.paymentMethods.length > 0) {
    this.paymentMethod.paymentMethods[0].isDefault = true;
  }
  
  await this.save();
};

// Instance method to set default payment method
clientSchema.methods.setDefaultPaymentMethod = async function(paymentMethodId) {
  if (!this.paymentMethod || !this.paymentMethod.paymentMethods) {
    throw new Error('No payment methods available');
  }
  
  const paymentMethod = this.paymentMethod.paymentMethods.find(pm => pm.id === paymentMethodId);
  if (!paymentMethod) {
    throw new Error('Payment method not found');
  }
  
  // Set all methods as non-default
  this.paymentMethod.paymentMethods.forEach(pm => {
    pm.isDefault = false;
  });
  
  // Set selected method as default
  paymentMethod.isDefault = true;
  
  await this.save();
};

// Instance method to clear all payment methods
clientSchema.methods.clearPaymentMethods = async function() {
  this.paymentMethod = undefined;
  await this.save();
};

// Legacy method for backward compatibility
clientSchema.methods.updatePaymentMethod = async function(tokenizedPaymentData) {
  return this.addPaymentMethod(tokenizedPaymentData);
};

// Legacy method for backward compatibility
clientSchema.methods.clearPaymentMethod = async function() {
  return this.clearPaymentMethods();
};

// Remove sensitive payment data when converting to JSON (except when explicitly selected)
clientSchema.methods.toJSON = function() {
  const client = this.toObject();
  
  // Remove Stripe customer ID unless explicitly included
  if (client.paymentMethod && client.paymentMethod.stripeCustomerId) {
    delete client.paymentMethod.stripeCustomerId;
  }
  
  // Remove payment method IDs for security
  if (client.paymentMethod && client.paymentMethod.paymentMethods) {
    client.paymentMethod.paymentMethods = client.paymentMethod.paymentMethods.map(pm => {
      const sanitized = { ...pm };
      // Keep only display information, remove sensitive IDs
      delete sanitized.id;
      return sanitized;
    });
  }
  
  delete client.__v;
  return client;
};

// Static method to find clients by status
clientSchema.statics.findByStatus = function(status) {
  return this.find({ contactStatus: status });
};

// Static method to find clients by owner
clientSchema.statics.findByOwner = function(ownerEmail) {
  return this.find({ ownedBy: ownerEmail });
};

// Static method to find qualified leads
clientSchema.statics.findQualifiedLeads = function() {
  return this.find({ contactStatus: { $in: ['Committed', 'Closed won'] } });
};

// Static method to find clients with expiring cards
clientSchema.statics.findExpiringCards = function() {
  const today = new Date();
  const threeMonthsFromNow = new Date(today.getFullYear(), today.getMonth() + 3);
  
  return this.find({
    'paymentMethod.paymentMethods': {
      $elemMatch: {
        expYear: { $lte: threeMonthsFromNow.getFullYear() },
        expMonth: { $lte: threeMonthsFromNow.getMonth() + 1 }
      }
    }
  });
};

// Static method for advanced search
clientSchema.statics.searchClients = function(criteria) {
  const query = {};
  
  if (criteria.name) {
    query.name = new RegExp(criteria.name, 'i');
  }
  if (criteria.email) {
    query.email = new RegExp(criteria.email, 'i');
  }
  if (criteria.city) {
    query.city = new RegExp(criteria.city, 'i');
  }
  if (criteria.industry) {
    query.industry = criteria.industry;
  }
  if (criteria.contactStatus) {
    query.contactStatus = criteria.contactStatus;
  }
  if (criteria.ownedBy) {
    query.ownedBy = criteria.ownedBy;
  }
  
  return this.find(query);
};

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;