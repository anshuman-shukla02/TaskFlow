// seed_admin.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/amep';

const seedAdmin = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected for seeding');

    const adminEmail = 'admin@taskflow.com';
    const adminPassword = 'Admin@123';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log('⚠️ Admin account already exists');
      process.exit(0);
    }

    const admin = new User({
      name: 'System Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      status: 'approved',
      division: 'A',
      rollNumber: 'ADMIN-001'
    });

    await admin.save();
    console.log('🚀 Admin account seeded successfully!');
    console.log('Email: admin@taskflow.com');
    console.log('Password: Admin@123');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedAdmin();
