const express = require('express');
const router = express.Router();
const Menu = require('../models/Menu');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// JWT Secret (should match the one in auth.js)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  // First check session
  if (req.session && req.session.user) {
    return next();
  }
  
  // If no session, check for JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded; // Set user from token
      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
    }
  }
  
  res.status(401).json({ message: 'Not authenticated' });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  // Get user from either session or JWT token verification
  const user = req.session?.user || req.user;
  
  if (user && user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Not authorized' });
};

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const menuItems = await Menu.find({ isAvailable: true });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Error fetching menu items', error: error.message });
  }
});

// Debug endpoint to check menu collection status
router.get('/debug', async (req, res) => {
  try {
    // Check if the collection exists
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    const menuCollectionExists = collectionNames.includes('menus');
    
    // Count documents
    const count = await Menu.countDocuments();
    
    // Get model info
    const modelInfo = {
      collection: Menu.collection.name,
      modelName: Menu.modelName,
      schema: Object.keys(Menu.schema.paths)
    };
    
    res.json({
      status: 'ok',
      menuCollectionExists,
      documentCount: count,
      modelInfo,
      collections: collectionNames
    });
  } catch (error) {
    console.error('Error in menu debug endpoint:', error);
    res.status(500).json({ 
      message: 'Error checking menu collection',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get menu items by category
router.get('/category/:category', async (req, res) => {
  try {
    const menuItems = await Menu.find({
      category: req.params.category,
      isAvailable: true
    });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items by category:', error);
    res.status(500).json({ message: 'Error fetching menu items', error: error.message });
  }
});

// Add new menu item (admin only)
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const menuItem = new Menu(req.body);
    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ message: 'Error adding menu item', error: error.message });
  }
});

// Update menu item (admin only)
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const menuItem = await Menu.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Error updating menu item', error: error.message });
  }
});

// Delete menu item (admin only)
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const menuItem = await Menu.findByIdAndDelete(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Error deleting menu item', error: error.message });
  }
});

// Toggle menu item availability (admin only)
router.put('/:id/toggle-availability', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const menuItem = await Menu.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();
    
    res.json(menuItem);
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    res.status(500).json({ message: 'Error toggling menu item availability', error: error.message });
  }
});

module.exports = router; 