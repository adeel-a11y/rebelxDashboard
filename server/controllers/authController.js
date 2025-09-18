const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Register new user
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password, name, role, department, phone, hourlyRate } = req.body;

    // Check if user already exists
    const existingUser = await User.findById(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User with this email already exists' 
      });
    }

    // Create new user
    const user = new User({
      _id: email.toLowerCase(),
      email: email.toLowerCase(),
      password,
      name,
      role: role || 'employee',
      department,
      phone,
      hourlyRate,
      status: 'active'
    });

    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    // Update last login
    await user.updateLastLogin();

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Error registering user', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findById(email.toLowerCase()).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({ 
        message: 'Account is inactive. Please contact administrator.' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = user.generateAuthToken();

    // Update last login
    await user.updateLastLogin();

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Error during login', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Get current user
const getCurrentUser = async (req, res) => {
  try {
    // req.userId is set by auth middleware
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      message: 'Error fetching user data', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

// Logout user (client-side token removal, but we can track logout if needed)
const logout = async (req, res) => {
  try {
    // Optional: You could maintain a token blacklist in Redis or database
    // For now, we'll just return success and let client remove the token
    
    // Optional: Log the logout activity
    const user = await User.findById(req.userId);
    if (user) {
      // You could add a logout timestamp or activity log here
      console.log(`User ${user.email} logged out at ${new Date().toISOString()}`);
    }

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Error during logout', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout
};