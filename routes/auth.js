const express = require('express');
const router = express.Router();
const User = require('../models/User');
const otpGenerator = require('otp-generator');
const axios = require('axios');
const jwt = require('jsonwebtoken');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// Generate a unique random email for testing purposes
const generateUniqueEmail = (phone) => {
  const timestamp = Date.now();
  return `user_${phone}_${timestamp}@placeholder.com`;
};

// Send SMS using Fast2SMS API
const sendSMS = async (phone, message) => {
  try {
    console.log('Attempting to send SMS to:', phone);
    console.log('With message:', message);
    console.log('Using API key exists:', !!process.env.FAST2SMS_API_KEY);
    
    // If no API key in production, return mock success for debugging
    if (!process.env.FAST2SMS_API_KEY && process.env.NODE_ENV === 'production') {
      console.log('No API key found, returning mock success');
      return { status: 'success', message: 'SMS would be sent in production' };
    }
    
    const url = 'https://www.fast2sms.com/dev/bulkV2';
    
    const headers = {
      "Content-Type": "application/json",
      "Authorization": process.env.FAST2SMS_API_KEY
    };
    
    const data = {
      route: "v3",
      sender_id: "TXTIND",
      message: message,
      language: "english",
      flash: 0,
      numbers: phone
    };
    
    console.log('Sending request to Fast2SMS with headers:', JSON.stringify(headers));
    console.log('And data:', JSON.stringify(data));
    
    const response = await axios.post(url, data, { headers });
    console.log('Fast2SMS API Response:', response.data);
    
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

    console.log('OTP request for phone:', phone, 'name:', name);

    // Generate a 6-digit OTP
    const otp = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });

    console.log('Generated OTP:', otp);

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
      console.log('Creating new user with phone:', phone, 'name:', name);
      
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
      console.log('Updating existing user OTP data for phone:', phone);
      // Update existing user's OTP
      user.otpData = { otp, expiresAt };
    }

    await user.save();
    console.log('User saved successfully');

    // Always return the OTP in development mode
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    try {
      // Skip SMS in development unless specifically requested
      if (isDevelopment && !req.query.sendSms) {
        console.log('Development mode: Skipping actual SMS send');
        return res.json({ 
          message: 'OTP generated successfully (SMS not sent in development)',
          otp, // Include OTP in response for development
          isNewUser
        });
      }
      
      const message = `Your GCET Food Ordering verification code is: ${otp}. Valid for 10 minutes.`;
      const smsResponse = await sendSMS(phone, message);
      console.log('SMS sent successfully:', smsResponse);
      
      if (isDevelopment) {
        // In development, always return the OTP for testing
        return res.json({ 
          message: 'OTP sent successfully',
          otp, // Include OTP in response for development
          isNewUser
        });
      }
      
      res.json({ 
        message: 'OTP sent successfully', 
        isNewUser
      });
    } catch (smsError) {
      console.error('Error sending SMS:', smsError);
      
      // Always return the OTP if there's an SMS error
      res.status(200).json({ 
        message: 'OTP generated successfully (SMS failed)', 
        otp, 
        isNewUser,
        error: process.env.NODE_ENV === 'production' ? 'SMS service unavailable' : smsError.message,
        note: 'OTP is included in the response for testing purposes'
      });
    }
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ 
      message: 'Error generating OTP', 
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log('Verifying OTP for phone:', phone, 'OTP:', otp);

    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      console.log('User not found for phone:', phone);
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if OTP matches and is not expired
    const now = new Date();
    if (
      !user.otpData || 
      user.otpData.otp !== otp || 
      now > new Date(user.otpData.expiresAt)
    ) {
      console.log('Invalid or expired OTP. Expected:', user.otpData?.otp, 'Got:', otp);
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP data after successful verification
    user.otpData = undefined;
    await user.save();
    console.log('OTP verified successfully for user:', user._id);

    // Create user data for session and response
    const userData = {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      block: user.block,
      classNumber: user.classNumber,
      profileCompleted: user.profileCompleted
    };

    // Create JWT token
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log('Generated JWT token for user');

    // Set user in session
    req.session.user = userData;
    
    // Save session explicitly and wait for completion
    try {
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            reject(err);
          } else {
            console.log('Session saved successfully');
            resolve();
          }
        });
      });
      console.log('Session user set:', req.session.user);
      console.log('Session ID:', req.session.id);
    } catch (sessionError) {
      console.error('Error saving session, but continuing with JWT token:', sessionError);
    }
    
    // Return both the user data and token
    res.json({
      ...userData,
      token
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
});

// Get current user
router.get('/current-user', async (req, res) => {
  console.log('Current user request received');
  console.log('Session ID:', req.session.id);
  console.log('Cookies:', req.headers.cookie);
  
  try {
    // First try to get user from session
    if (req.session.user) {
      console.log('User found in session:', req.session.user._id);
      return res.json(req.session.user);
    }

    // If no user in session, try to get from token in Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('Got token from Authorization header');
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('JWT token verified for user:', decoded._id);
        
        // Set user in session for future requests
        req.session.user = decoded;
        await new Promise((resolve) => {
          req.session.save(() => resolve());
        });
        
        return res.json(decoded);
      } catch (jwtError) {
        console.error('Invalid JWT token:', jwtError.message);
      }
    }
    
    console.log('No user in session or valid token');
    res.status(401).json({ message: 'Not authenticated' });
  } catch (error) {
    console.error('Error in current-user endpoint:', error);
    res.status(500).json({ message: 'Error checking authentication', error: error.message });
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
    console.log('Profile update request received');
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Session ID:', req.session?.id);
    console.log('User in session:', !!req.session?.user);
    
    // Get user from session or token
    let userId = null;
    let userData = null;
    
    // Debug auth header
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (req.session && req.session.user) {
      console.log('Using user from session:', req.session.user._id);
      userId = req.session.user._id;
      userData = req.session.user;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log('Extracted token from Authorization header');
      
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('JWT token verified successfully for user:', decoded._id);
        userId = decoded._id;
        userData = decoded;
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError.message);
      }
    } else {
      // FALLBACK: Get token from body if client hasn't implemented header yet
      const { token } = req.body;
      if (token) {
        console.log('Using token from request body as fallback');
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          console.log('Body token verified successfully for user:', decoded._id);
          userId = decoded._id;
          userData = decoded;
        } catch (jwtError) {
          console.error('Body token verification failed:', jwtError.message);
        }
      }
    }
    
    if (!userId) {
      console.log('Not authenticated - no valid user identification');
      return res.status(401).json({ 
        message: 'Not authenticated',
        help: 'You need to login first and include the token in your request' 
      });
    }

    const { block, classNumber } = req.body;
    console.log('Updating profile for user:', userId, 'with block:', block, 'class:', classNumber);
    
    // Validate inputs
    if (!block || !classNumber) {
      return res.status(400).json({ 
        message: 'Block and class number are required' 
      });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        block, 
        classNumber,
        profileCompleted: true 
      },
      { new: true }
    );

    if (!user) {
      console.log('User not found in database:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User profile updated in database:', user._id);

    // Create updated user data
    const updatedUserData = {
      _id: user._id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      block: user.block,
      classNumber: user.classNumber,
      profileCompleted: user.profileCompleted
    };

    // Create a new JWT token with updated info
    const newToken = jwt.sign(updatedUserData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    console.log('Generated new JWT token with updated profile data');

    // Update session with new user data if session exists
    if (req.session) {
      req.session.user = updatedUserData;
      
      // Save session explicitly
      try {
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Session save error:', err);
              reject(err);
            } else {
              console.log('Session saved successfully after profile update');
              resolve();
            }
          });
        });
      } catch (sessionError) {
        console.error('Error saving session, but continuing with JWT token:', sessionError);
      }
    }

    console.log('Sending updated user data to client');
    res.json({
      ...updatedUserData,
      token: newToken
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      message: 'Error updating profile', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// TEMPORARY ROUTE TO CREATE ADMIN USER - REMOVE AFTER USE
router.post('/create-admin', async (req, res) => {
  try {
    const { phone, name, secretKey } = req.body;
    
    // Security check - replace 'gcet-admin-secret' with your own secret password
    if (secretKey !== 'gcet-admin-secret') {
      return res.status(401).json({ message: 'Invalid secret key' });
    }
    
    let user = await User.findOne({ phone });
    
    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      await user.save();
      console.log(`User with phone ${phone} updated to admin role`);
      res.json({ 
        message: 'User updated to admin role', 
        userId: user._id,
        instructions: 'You can now use this phone number to login as admin'
      });
    } else {
      // Create new admin user
      const placeholderEmail = `admin_${phone}@example.com`;
      user = new User({
        phone,
        name,
        email: placeholderEmail,
        role: 'admin',
        block: "",
        classNumber: "",
        profileCompleted: true
      });
      await user.save();
      console.log(`New admin user created with phone ${phone}`);
      res.json({ 
        message: 'Admin user created successfully', 
        userId: user._id,
        instructions: 'You can now use this phone number to login as admin'
      });
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ message: 'Error creating admin user', error: error.message });
  }
});

module.exports = router; 