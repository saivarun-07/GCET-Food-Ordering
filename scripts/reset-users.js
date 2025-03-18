require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MongoDB URI is missing. Please set MONGODB_URI in your environment.');
  process.exit(1);
}

async function resetUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully');

    // Delete all existing users
    const deleteResult = await User.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing users`);

    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Bunty@007', salt);
    
    const adminUser = new User({
      name: 'BONALA SAI VARUN GUPTA',
      phone: '8897128063',
      email: 'admin@gcet.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerified: true,
      profileCompleted: true,
      authMethods: ['phone']
    });

    await adminUser.save();
    console.log('Admin user created successfully');
    console.log({
      name: adminUser.name,
      phone: adminUser.phone,
      role: adminUser.role,
      id: adminUser._id
    });

    console.log('\nYou can now login with:');
    console.log('Phone: 8897128063');
    console.log('Password: Bunty@007');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
resetUsers(); 