require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Only import MongoMemoryServer in development
let MongoMemoryServer;
if (process.env.NODE_ENV === 'development') {
  const { MongoMemoryServer: MemServer } = require('mongodb-memory-server');
  MongoMemoryServer = MemServer;
}

const app = express();

// Trust proxy - needed for hosting platforms like Render
app.set('trust proxy', 1);

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
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Add rate limiting for production
if (process.env.NODE_ENV === 'production') {
  const rateLimit = require('express-rate-limit');
  
  // Apply rate limiting to all requests
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
  });
  
  app.use(globalLimiter);
  
  // Additional security headers for production
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
}

// Body parser middleware
app.use(express.json());

// Configure MongoDB connection
const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI;
    
    // Use in-memory MongoDB for development
    if (process.env.NODE_ENV === 'development' && MongoMemoryServer) {
      console.log('Using in-memory MongoDB server for development');
      const mongod = await MongoMemoryServer.create();
      mongoURI = mongod.getUri();
      
      // Save the URI to be accessible by other scripts
      process.env.MONGODB_MEMORY_URI = mongoURI;
      
      console.log(`In-memory MongoDB URI: ${mongoURI}`);
    } else {
      console.log(`MongoDB URI exists: ${!!process.env.MONGODB_URI}`);
      
      // When using MongoDB Atlas in production, use mongoose connection options
      // that help with DNS issues and connection stability
      const mongooseOptions = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 seconds
        socketTimeoutMS: 45000, // 45 seconds
        family: 4 // Use IPv4 instead of trying IPv6 first
      };
      
      // Log the URI format (without showing credentials)
      try {
        const uri = new URL(mongoURI);
        console.log(`MongoDB URI format: ${uri.protocol}//${uri.username ? '****' : ''}:${uri.password ? '****' : ''}@${uri.host}${uri.pathname}${uri.search}`);
        console.log(`Name=${uri.searchParams.get('appName') || 'Not specified'}`);
      } catch (error) {
        console.log(`Could not parse MongoDB URI: ${error.message}`);
      }
      
      // Connect with the options for better reliability
      await mongoose.connect(mongoURI, mongooseOptions);
    }
    
    console.log('MongoDB Connected');
    
    if (process.env.NODE_ENV === 'development') {
      // Add some testing data - create admin user automatically
      try {
        const User = require('./models/User');
        
        // Check if admin user already exists
        const existingAdmin = await User.findOne({ phone: '8897128063' });
        
        if (!existingAdmin) {
          console.log('Creating default admin user...');
          const admin = new User({
            name: 'BONALA SAI VARUN GUPTA',
            phone: '8897128063',
            email: 'admin@gcet.com',
            password: 'Bunty@007',
            role: 'admin',
            authMethods: ['phone', 'email'],
            isEmailVerified: true,
            isPhoneVerified: true,
            profileCompleted: true
          });
          
          await admin.save();
          console.log('Default admin user created');
        } else {
          console.log('Admin user already exists');
        }
      } catch (error) {
        console.error('Error creating default admin user:', error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    if (error.message.includes('querySrv EREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('DNS resolution error with MongoDB Atlas. This may be due to:');
      console.error('1. Network connectivity issues - check your internet connection');
      console.error('2. DNS server issues - try using a different DNS server');
      console.error('3. Firewall blocking outbound DNS - check your firewall settings');
    }
    console.error('If this is a connection refused error, please ensure MongoDB is running.');
    console.error('If this is an authentication error, check your MongoDB username and password.');
    console.error('If this is a network error, check your network connection and MongoDB Atlas IP whitelist.');
    return false;
  }
};

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));

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