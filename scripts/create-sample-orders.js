require('dotenv').config();
const mongoose = require('mongoose');
const Menu = require('../models/Menu');

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('MongoDB URI:', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'));
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create Order model directly in script to avoid circular dependencies
const OrderSchema = new mongoose.Schema({
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Menu',
      required: true
    },
    name: String,
    price: Number,
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryLocation: {
    type: String,
    required: true
  },
  customerDetails: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    email: String
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', OrderSchema);

// Create sample orders
const createSampleOrders = async () => {
  try {
    console.log('Checking if Orders collection exists...');
    
    // Check if any orders exist
    const orderCount = await Order.countDocuments();
    console.log(`Found ${orderCount} existing orders`);
    
    if (orderCount > 0) {
      console.log('Orders collection already has data. Skipping sample order creation.');
      return;
    }
    
    console.log('Creating sample orders...');
    
    // Get menu items to use in orders
    const menuItems = await Menu.find();
    
    if (menuItems.length === 0) {
      console.log('No menu items found. Please run the add-menu-items.js script first.');
      return;
    }
    
    // Create sample customer orders
    const sampleOrders = [
      {
        items: [
          {
            menuItemId: menuItems[0]._id,
            name: menuItems[0].name,
            price: menuItems[0].price,
            quantity: 2
          },
          {
            menuItemId: menuItems[4]._id,
            name: menuItems[4].name,
            price: menuItems[4].price,
            quantity: 1
          }
        ],
        totalAmount: (menuItems[0].price * 2) + menuItems[4].price,
        status: 'pending',
        deliveryLocation: 'Block A, Room 102',
        customerDetails: {
          name: 'Rahul Kumar',
          phone: '9876543210',
          email: 'rahul@example.com'
        },
        paymentStatus: 'pending'
      },
      {
        items: [
          {
            menuItemId: menuItems[5]._id,
            name: menuItems[5].name,
            price: menuItems[5].price,
            quantity: 1
          }
        ],
        totalAmount: menuItems[5].price,
        status: 'preparing',
        deliveryLocation: 'Block B, Room 215',
        customerDetails: {
          name: 'Priya Sharma',
          phone: '8765432109',
          email: 'priya@example.com'
        },
        paymentStatus: 'completed'
      },
      {
        items: [
          {
            menuItemId: menuItems[10]._id,
            name: menuItems[10].name,
            price: menuItems[10].price,
            quantity: 1
          },
          {
            menuItemId: menuItems[20]._id,
            name: menuItems[20].name,
            price: menuItems[20].price,
            quantity: 2
          }
        ],
        totalAmount: menuItems[10].price + (menuItems[20].price * 2),
        status: 'delivered',
        deliveryLocation: 'Block C, Room 305',
        customerDetails: {
          name: 'Amit Patel',
          phone: '7654321098',
          email: 'amit@example.com'
        },
        paymentStatus: 'completed'
      },
      {
        items: [
          {
            menuItemId: menuItems[15]._id,
            name: menuItems[15].name,
            price: menuItems[15].price,
            quantity: 3
          }
        ],
        totalAmount: menuItems[15].price * 3,
        status: 'cancelled',
        deliveryLocation: 'Block D, Room 410',
        customerDetails: {
          name: 'Sneha Reddy',
          phone: '6543210987',
          email: 'sneha@example.com'
        },
        paymentStatus: 'failed'
      },
      {
        items: [
          {
            menuItemId: menuItems[3]._id,
            name: menuItems[3].name,
            price: menuItems[3].price,
            quantity: 2
          },
          {
            menuItemId: menuItems[8]._id,
            name: menuItems[8].name,
            price: menuItems[8].price,
            quantity: 1
          },
          {
            menuItemId: menuItems[22]._id,
            name: menuItems[22].name,
            price: menuItems[22].price,
            quantity: 2
          }
        ],
        totalAmount: (menuItems[3].price * 2) + menuItems[8].price + (menuItems[22].price * 2),
        status: 'ready',
        deliveryLocation: 'Block E, Room 512',
        customerDetails: {
          name: 'Vikram Singh',
          phone: '5432109876',
          email: 'vikram@example.com'
        },
        paymentStatus: 'completed'
      }
    ];
    
    // Insert sample orders
    const result = await Order.insertMany(sampleOrders);
    console.log(`Created ${result.length} sample orders`);
    
    // Log order IDs
    result.forEach((order, index) => {
      console.log(`Order ${index + 1} ID: ${order._id}`);
    });
    
    console.log('Sample orders created successfully!');
  } catch (error) {
    console.error('Error creating sample orders:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the function
connectDB().then(() => {
  createSampleOrders();
}); 