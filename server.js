const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const createSessionStore = require('./config/session');
require('dotenv').config();

const app = express();

// Debug environment variables
console.log('Environment:', process.env.NODE_ENV);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
if (process.env.MONGODB_URI) {
  // Log the first part of the URI (without credentials) for debugging
  const uriParts = process.env.MONGODB_URI.split('@');
  console.log('MongoDB URI format:', uriParts[0].split('://')[0] + '://****@' + uriParts[1]);
}

// Add Content Security Policy headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://*.onrender.com"
  );
  next();
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:3000',
  credentials: true
}));

// MongoDB connection
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

// MongoDB connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// Connect to MongoDB first
mongoose.connect(mongoUri, mongooseOptions)
  .then(async () => {
    console.log('MongoDB Connected');
    
    // Session configuration
    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      store: await createSessionStore(),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      }
    };

    app.use(session(sessionConfig));

    // Authentication Middleware
    app.use((req, res, next) => {
      // Make user available in templates
      res.locals.user = req.session.user || null;
      next();
    });

    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/orders', require('./routes/orders'));
    app.use('/api/menu', require('./routes/menu'));

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      app.use(express.static(path.join(__dirname, 'client/build')));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client/build', 'index.html'));
      });
    }

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('Connection string format:', mongoUri.startsWith('mongodb+srv://') ? 'Valid' : 'Invalid');
    process.exit(1);
  }); 