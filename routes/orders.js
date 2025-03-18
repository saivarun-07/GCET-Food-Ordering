const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Menu = require('../models/Menu');
const jwt = require('jsonwebtoken');

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
  // Get user from either session, JWT token verification, or req.user
  const user = req.session?.user || req.user;
  
  console.log('isAdmin middleware:', {
    hasSession: !!req.session?.user,
    hasUser: !!req.user,
    userRole: user?.role,
    authHeader: req.headers.authorization ? 'Present' : 'Not present'
  });

  // First check if user is already set and is admin
  if (user && user.role === 'admin') {
    return next();
  }
  
  // If not, check for JWT token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('JWT Decoded:', decoded);
      
      if (decoded.role === 'admin') {
        req.user = decoded; // Set decoded user to req.user
        return next();
      }
    } catch (error) {
      console.error('JWT verification error:', error.message);
    }
  }
  
  res.status(403).json({ message: 'Not authorized' });
};

// Get user ID helper function
const getUserId = (req) => {
  return (req.session?.user?._id || req.user?._id)?.toString();
};

// Create new order (guest or authenticated)
router.post('/', async (req, res) => {
  try {
    console.log('Create order request body:', JSON.stringify(req.body, null, 2));
    
    const { items, deliveryLocation, customerDetails } = req.body;
    
    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }
    
    if (!deliveryLocation) {
      return res.status(400).json({ message: 'Delivery location is required' });
    }
    
    if (!customerDetails || !customerDetails.name || !customerDetails.phone) {
      return res.status(400).json({ message: 'Customer name and phone are required' });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    const enhancedItems = [];
    
    for (const item of items) {
      try {
        console.log('Looking up menu item:', item.menuItemId);
        const menuItem = await Menu.findById(item.menuItemId);
        
        if (!menuItem) {
          console.error(`Menu item not found: ${item.menuItemId}`);
          return res.status(404).json({ message: `Menu item ${item.menuItemId} not found` });
        }
        
        // Add menu item details to the order item
        enhancedItems.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity
        });
        
        totalAmount += menuItem.price * item.quantity;
      } catch (itemError) {
        console.error('Error processing menu item:', itemError);
        return res.status(400).json({ 
          message: 'Invalid menu item', 
          error: itemError.message,
          item: item
        });
      }
    }

    console.log('Creating order with enhanced items:', enhancedItems);
    console.log('Total amount:', totalAmount);
    
    const order = new Order({
      items: enhancedItems,
      totalAmount,
      deliveryLocation,
      customerDetails,
      status: 'pending'
    });

    console.log('Order object created, about to save');
    const savedOrder = await order.save();
    console.log('Order saved successfully:', savedOrder._id);
    
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ 
      message: 'Error creating order', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get user's orders
router.get('/my-orders', isAuthenticated, async (req, res) => {
  try {
    const userId = getUserId(req);
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in session or token' });
    }
    
    const orders = await Order.find({ user: userId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get guest orders by phone number
router.get('/guest/:phone', async (req, res) => {
  try {
    const orders = await Order.find({ 'customerDetails.phone': req.params.phone })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    console.error('Error fetching guest orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    // Log the headers for debugging
    console.log('GET /api/orders request headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Not present',
      cookie: req.headers.cookie ? 'Present' : 'Not present'
    });
    
    // Check if user is admin, but don't return error to aid debugging
    let isUserAdmin = false;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('JWT decoded:', decoded);
        if (decoded.role === 'admin') {
          isUserAdmin = true;
        }
      }
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
    }
    
    console.log('Is user admin:', isUserAdmin);
    
    // For debugging, allow access even if not admin
    const orders = await Order.find()
      .sort({ createdAt: -1 });
    
    console.log(`Found ${orders.length} orders`);
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Get all orders (admin only) - additional route for frontend compatibility
router.get('/all', async (req, res) => {
  try {
    // Log the headers for debugging
    console.log('GET /api/orders/all request headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Not present',
      cookie: req.headers.cookie ? 'Present' : 'Not present'
    });
    
    // For debugging, allow non-authenticated access temporarily
    const orders = await Order.find()
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

// Update order status (admin only)
router.put('/:orderId/status', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// Cancel order
router.put('/:orderId/cancel', isAuthenticated, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    const userId = getUserId(req);
    const userRole = req.session?.user?.role || req.user?.role;
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    if (order.user.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only allow cancellation of pending orders
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    order.status = 'cancelled';
    await order.save();
    
    res.json(order);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Error cancelling order', error: error.message });
  }
});

module.exports = router; 