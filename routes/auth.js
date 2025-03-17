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
  max: 3, // 3 attempts
  message: 'Too many registration attempts. Please try again later.'
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
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

// Register new user
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, phone, password, authMethod = 'email' } = req.body;

    // Validate required fields based on auth method
    if (authMethod === 'email' && (!email || !password)) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    if (authMethod === 'phone' && !phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email || undefined },
        { phone: phone || undefined },
        { 'socialProfiles.google.email': email },
        { 'socialProfiles.facebook.email': email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this email or phone number already exists'
      });
    }

    // Create user based on auth method
    const userData = {
      name,
      authMethods: [authMethod]
    };

    if (authMethod === 'email') {
      userData.email = email;
      userData.password = password;
      userData.verificationToken = generateVerificationToken();
      userData.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    } else if (authMethod === 'phone') {
      userData.phone = phone;
      userData.isPhoneVerified = true; // Phone verification handled separately
    }

    const user = new User(userData);
    await user.save();

    // Send verification email if using email auth
    if (authMethod === 'email') {
      const emailSent = await sendVerificationEmail(email, user.verificationToken);
      res.status(201).json({
        message: 'Registration successful. Please check your email for verification code.',
        emailSent,
        verificationToken: emailSent ? undefined : user.verificationToken
      });
    } else {
      res.status(201).json({
        message: 'Registration successful',
        userId: user._id
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = await User.findOne({ 
      email,
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Invalid or expired verification code' 
      });
    }

    // Update user verification status
    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Email verified successfully',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Error verifying email', error: error.message });
  }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.verificationToken = verificationToken;
    user.verificationTokenExpires = verificationTokenExpires;
    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken);

    res.json({
      message: 'Verification email sent successfully',
      emailSent,
      verificationToken: emailSent ? undefined : verificationToken
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ message: 'Error resending verification email', error: error.message });
  }
});

// Login user
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, phone, password, authMethod = 'email' } = req.body;

    // Find user based on auth method
    let user;
    if (authMethod === 'email') {
      user = await User.findOne({ email });
    } else if (authMethod === 'phone') {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      return res.status(401).json({
        message: 'Account is locked. Please try again later.',
        lockedUntil: user.accountLockedUntil
      });
    }

    // Verify credentials based on auth method
    let isValid = false;
    if (authMethod === 'email') {
      if (!user.isEmailVerified) {
        return res.status(401).json({
          message: 'Please verify your email first',
          email: user.email
        });
      }
      isValid = await user.comparePassword(password);
    } else if (authMethod === 'phone') {
      if (!user.isPhoneVerified) {
        return res.status(401).json({
          message: 'Please verify your phone number first'
        });
      }
      isValid = true; // Phone verification handled separately
    }

    if (!isValid) {
      await user.incrementLoginAttempts();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
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

module.exports = router; 