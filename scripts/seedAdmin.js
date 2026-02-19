const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const path = require('path');
const connectDB = require('../config/db');

// Load env vars from the root directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const seedAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    console.log('MongoDB Connected to seed admin...');

    const adminEmail = 'sarman@gmail.com';

    // Check if admin already exists
    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      console.log('Admin user already exists.');
      process.exit();
    }

    // Create admin user
    const admin = await User.create({
      fullName: 'System Admin',
      email: adminEmail,
      password: 'admin1234', // You should change this after first login
      role: 'admin',
      status: 'Active'
    });

    if (admin) {
      console.log('Admin user created successfully!');
      console.log(`Email: ${adminEmail}`);
      console.log('Password: admin1234');
    }

    process.exit();
  } catch (error) {
    console.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();
