const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    default: null
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  block: {
    type: String,
    required: false
  },
  classNumber: {
    type: String,
    required: false
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  otpData: {
    otp: String,
    expiresAt: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema); 