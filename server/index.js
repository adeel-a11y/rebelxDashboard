const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Webhook routes must be defined before body parsing middleware
const webhookRoutes = require('./routes/webhookRoutes');
app.use('/api/webhooks', webhookRoutes);

// Middleware
// Allow dev origins (3000 and 3001) and optional CLIENT_URL from env
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// Increase body size limits to handle large JSON batches and form uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'rebelX',
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const activityRoutes = require('./routes/activities');
const paymentRoutes = require('./routes/payments');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/payments', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RebelX V3 Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  await connectDB();

  // Create HTTP server so we can control timeouts for long-running requests (e.g., CSV import)
  const server = http.createServer(app);
  // Allow up to 10 minutes for the entire request lifecycle
  server.requestTimeout = 10 * 60 * 1000; // 10 minutes
  // Headers timeout must be greater than requestTimeout
  server.headersTimeout = 11 * 60 * 1000; // 11 minutes
  // Keep connections alive longer to avoid premature disconnects during uploads
  server.keepAliveTimeout = 120 * 1000; // 120 seconds

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`HTTP server timeouts -> requestTimeout: ${server.requestTimeout}ms, headersTimeout: ${server.headersTimeout}ms, keepAliveTimeout: ${server.keepAliveTimeout}ms`);
  });
};

startServer();