const express = require('express');
const router = express.Router();
const User = require('../models/User');
const otpGenerator = require('otp-generator');
const axios = require('axios');

// Generate a unique random email for testing purposes
const generateUniqueEmail = (phone) => {
  const timestamp = Date.now();
  return `user_${phone}_${timestamp}@placeholder.com`;
};

// Send SMS using Fast2SMS API
const sendSMS = async (phone, message) => {
  try {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      authorization: process.env.FAST2SMS_API_KEY,
      message: message,
      numbers: phone
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Fast2SMS API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Generate and send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    // Set OTP expiry time to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Find user by phone or create a new one
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      // Only create a new user if name is provided
      if (!name) {
        return res.status(400).json({ message: 'Name is required for registration' });
      }
      
      isNewUser = true;
      // Generate a placeholder email for new users to avoid duplicate key errors
      const placeholderEmail = generateUniqueEmail(phone);
      
      user = new User({
        phone,
        name,
        email: placeholderEmail,
        otpData: { otp, expiresAt },
        // Initialize with empty values, will be filled during profile update
        block: "",
        classNumber: "",
        profileCompleted: false
      });
    } else {
      // Update existing user's OTP
      user.otpData = { otp, expiresAt };
    }

    await user.save();

    // Send OTP via SMS
    try {
      const message = `Your GCET Food Ordering verification code is: ${otp}. Valid for 10 minutes.`;
      await sendSMS(phone, message);
      
      res.json({ 
        message: 'OTP sent successfully', 
        isNewUser
      });
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      // In development mode, return the OTP in response if SMS fails
      if (process.env.NODE_ENV === 'development') {
        res.json({ 
          message: 'OTP generated successfully (SMS failed)', 
          otp, 
          isNewUser,
          note: 'This is for development only. In production, OTP would not be revealed in response.'
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to send OTP via SMS',
          error: smsError.message 
        });
      }
    }
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ message: 'Error generating OTP', error: error.message });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP matches and is not expired
    const now = new Date();
    if (
      !user.otpData || 
      user.otpData.otp !== otp || 
      now > new Date(user.otpData.expiresAt)
    ) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP data after successful verification
    user.otpData = undefined;
    await user.save();

    // Set user in session
    req.session.user = {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      block: user.block,
      classNumber: user.classNumber,
      profileCompleted: user.profileCompleted
    };

    res.json({
      _id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      block: user.block,
      classNumber: user.classNumber,
      profileCompleted: user.profileCompleted
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
});

// Get current user
router.get('/current-user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Update user profile (block and class number)
router.put('/profile', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { block, classNumber } = req.body;
    
    // Validate inputs
    if (!block || !classNumber) {
      return res.status(400).json({ 
        message: 'Block and class number are required' 
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.session.user._id,
      { 
        block, 
        classNumber,
        profileCompleted: true 
      },
      { new: true }
    );

    // Update session with new user data
    req.session.user = {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      block: user.block,
      classNumber: user.classNumber,
      profileCompleted: user.profileCompleted
    };

    res.json(req.session.user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

module.exports = router; 