require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();

// CORS configuration - place this before other middleware
app.use(cors({
  origin: ['https://canteen-frontend-dqqv.onrender.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,  // Disable CSP for development
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parser middleware
app.use(express.json());

// Configure MongoDB connection
const connectDB = async () => {
  try {
    console.log(`MongoDB URI exists: ${!!process.env.MONGODB_URI}`);
    const mongoURI = process.env.MONGODB_URI;
    
    // Log the URI format (without showing credentials)
    const uri = new URL(mongoURI);
    console.log(`MongoDB URI format: ${uri.protocol}//${uri.username ? '****' : ''}:${uri.password ? '****' : ''}@${uri.host}${uri.pathname}${uri.search}`);
    console.log(`Name=${uri.searchParams.get('appName') || 'Not specified'}`);
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    console.error('If this is a connection refused error, please ensure MongoDB is running.');
    console.error('If this is an authentication error, please check your MongoDB username and password.');
    console.error('If this is a network error, please check your network connection and MongoDB Atlas IP whitelist.');
    return false;
  }
};

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'GCET Food Ordering API Server',
    status: 'online',
    endpoints: {
      auth: '/api/auth',
      orders: '/api/orders',
      menu: '/api/menu',
      health: '/api/health'
    },
    mongoConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

// Start server only after connecting to MongoDB
const startServer = async () => {
  const isConnected = await connectDB();
  
  if (isConnected) {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } else {
    console.error('Failed to connect to MongoDB. Server will not start.');
    process.exit(1);
  }
};

startServer(); 