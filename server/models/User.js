const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// User Schema with email as _id for unique identification
const userSchema = new mongoose.Schema({
  _id: {
    type: String // Using email as the primary key
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't return password by default in queries
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['admin', 'manager', 'employee'],
      message: 'Role must be either admin, manager, or employee'
    }
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 'Please provide a valid phone number']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative'],
    max: [10000, 'Hourly rate seems unrealistic']
  },
  image: {
    type: String, // URL to user's profile image
    match: [/^https?:\/\/.+/, 'Please provide a valid URL for the image']
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive'],
      message: 'Status must be either active or inactive'
    },
    default: 'active'
  },
  // Additional fields for authentication and security
  lastLogin: {
    type: Date,
    default: null
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  // Flexible metadata field for future extensions
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  _id: false // Disable automatic _id since we're using email
});

// Indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full display info
userSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.role})`;
});

// Pre-save hook to set email as _id and hash password
userSchema.pre('save', async function(next) {
  // Set email as _id if it's a new document
  if (this.isNew && this.email) {
    this._id = this.email.toLowerCase();
  }
  
  // Hash password if modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save hook to ensure email is lowercase
userSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { 
      userId: this._id, // Using email as userId
      email: this.email,
      role: this.role,
      name: this.name,
      department: this.department
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
  return token;
};

// Instance method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Instance method to check if user is manager or above
userSchema.methods.isManagerOrAbove = function() {
  return ['admin', 'manager'].includes(this.role);
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  // Use updateOne with runValidators:false to avoid full document validation
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { lastLogin: new Date() } },
    { runValidators: false }
  );
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.emailVerificationToken;
  delete user.__v;
  return user;
};

// Static method to find active users
userSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Static method to find by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role });
};

// Static method to find by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ department });
};

const User = mongoose.model('User', userSchema);

module.exports = User;