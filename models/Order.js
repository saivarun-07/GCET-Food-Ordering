const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerDetails: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  items: [{
    name: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'pending'
  },
  deliveryLocation: {
    block: {
      type: String,
      required: true
    },
    classNumber: {
      type: String,
      required: true
    }
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema); 