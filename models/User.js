const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      // Only require password for regular users, not OAuth users
      return this.authMethods && this.authMethods.includes('email');
    },
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'student'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpires: Date,
  otpData: {
    otp: String,
    expiresAt: Date
  },
  authMethods: [{
    type: String,
    enum: ['email', 'phone', 'google', 'facebook'],
    default: ['email']
  }],
  socialProfiles: {
    google: {
      id: String,
      email: String
    },
    facebook: {
      id: String,
      email: String
    }
  },
  lastLogin: Date,
  loginAttempts: {
    count: { type: Number, default: 0 },
    lastAttempt: Date
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  accountLockedUntil: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
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
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  // Skip hashing if password is empty (for OAuth users)
  if (!this.password) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('Error hashing password:', error);
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // If user has no password (OAuth users), always fail password comparison
    if (!this.password) return false;
    
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing password:', error);
    throw error;
  }
};

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
  this.loginAttempts.count += 1;
  this.loginAttempts.lastAttempt = Date.now();
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.loginAttempts.count >= 5) {
    this.accountLocked = true;
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  await this.save();
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts.count = 0;
  this.accountLocked = false;
  this.accountLockedUntil = undefined;
  await this.save();
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  if (!this.accountLocked) return false;
  
  if (this.accountLockedUntil && Date.now() > this.accountLockedUntil) {
    this.accountLocked = false;
    this.accountLockedUntil = undefined;
    return false;
  }
  
  return true;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 