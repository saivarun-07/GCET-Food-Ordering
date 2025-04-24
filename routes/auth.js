const express = require('express');
const router = express.Router();
const User = require('../models/User');
const otpGenerator = require('otp-generator');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { generateVerificationToken, sendVerificationEmail } = require('../utils/emailService');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts. Please try again later.'
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 10 : 3, // 10 attempts in development, 3 in production
  message: 'Too many registration attempts. Please try again later.'
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.NODE_ENV === 'production' ? '12h' : '24h';

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

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
router.get('/current-user', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        block: user.block,
        classNumber: user.classNumber,
        profileCompleted: user.profileCompleted
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      message: 'Error getting user data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // In a production environment, you might want to invalidate the token
    // by adding it to a blacklist or using a token version
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, email } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (email && email !== user.email) {
      user.email = email;
      user.isEmailVerified = false;
      user.verificationToken = generateVerificationToken();
      user.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
      await sendVerificationEmail(email, user.verificationToken);
    }

    await user.save();

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// TEMPORARY ROUTE TO CREATE ADMIN USER - REMOVE AFTER USE
router.post('/create-admin', async (req, res) => {
  try {
    const { phone, name, password, secretKey } = req.body;
    
    console.log('Admin creation attempt with:', { name, phone });
    
    // Security check - replace 'gcet-admin-secret' with your own secret password
    if (secretKey !== 'gcet-admin-secret') {
      return res.status(401).json({ message: 'Invalid secret key' });
    }
    
    // Validate required fields
    if (!name || !phone || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, phone, and password are required' 
      });
    }
    
    let user = await User.findOne({ phone });
    
    if (user) {
      // Update existing user to admin
      user.role = 'admin';
      if (password) {
        user.password = password;
      }
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
        password,
        email: placeholderEmail,
        authMethods: ['phone'],
        role: 'admin',
        block: "",
        classNumber: "",
        isEmailVerified: true,
        isPhoneVerified: true,
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

// Register with minimal information
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    
    console.log('Registration attempt:', { name, phone });

    // Validate required fields
    if (!name || !phone || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Name, phone number, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this phone number' 
      });
    }

    // Create new user with minimal information
    const user = new User({
      name,
      phone,
      password,
      email: `user_${phone}@placeholder.com`, // Generate placeholder email
      authMethods: ['phone'],
      role: 'student',
      isEmailVerified: true, // Skip email verification
      isPhoneVerified: true, // Skip phone verification
      isVerified: true, // Skip admin verification
      profileCompleted: true // Mark profile as complete
    });

    await user.save();
    console.log('User created successfully:', user._id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Return success with token
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error registering user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Simplified login with phone/password
router.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('Login attempt:', { phone: req.body.phone });
    const { phone, password } = req.body;

    // Validate required fields
    if (!phone || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Phone number and password are required' 
      });
    }

    // Find user by phone
    const user = await User.findOne({ phone });

    if (!user) {
      console.log('User not found:', { phone });
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      console.log('Account locked:', { phone: user.phone });
      return res.status(401).json({ 
        success: false,
        message: 'Account is locked. Please try again later.' 
      });
    }

    // Verify password
    const isValid = await user.comparePassword(password);

    if (!isValid) {
      console.log('Invalid credentials:', { phone: user.phone });
      await user.incrementLoginAttempts();
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    console.log('Login successful:', { phone: user.phone });
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during login',
      error: error.message 
    });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    await sendVerificationEmail(email, resetUrl, 'password-reset');

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request', error: error.message });
  }
});

// Reset password
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

// Admin route to verify students
router.post('/verify-student', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can verify students' 
      });
    }

    const { studentId, isVerified } = req.body;

    if (!studentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Student ID is required' 
      });
    }

    const student = await User.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    student.isVerified = isVerified;
    await student.save();

    res.json({
      success: true,
      message: `Student ${isVerified ? 'verified' : 'unverified'} successfully`,
      student: {
        id: student._id,
        name: student.name,
        studentId: student.studentId,
        classNumber: student.classNumber,
        block: student.block,
        rollNumber: student.rollNumber,
        isVerified: student.isVerified
      }
    });

  } catch (error) {
    console.error('Student verification error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error verifying student',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Admin route to get unverified students
router.get('/unverified-students', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const admin = await User.findById(req.user.userId);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Only admins can view unverified students' 
      });
    }

    const unverifiedStudents = await User.find({ 
      role: 'student',
      isVerified: false 
    }).select('-password');

    res.json({
      success: true,
      students: unverifiedStudents
    });

  } catch (error) {
    console.error('Error fetching unverified students:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching unverified students',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router; 