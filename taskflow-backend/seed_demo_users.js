// seed_demo_users.js
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/amep";

const demoUsers = [
  {
    name: "Demo Student",
    email: "student.demo@taskflow.com",
    password: "Student@123",
    role: "student",
    rollNumber: "STU-DEMO",
    division: "A",
    status: "approved"
  },
  {
    name: "Demo Faculty",
    email: "faculty.demo@taskflow.com",
    password: "Faculty@123",
    role: "faculty",
    rollNumber: "FAC-DEMO",
    division: "A",
    status: "approved"
  }
];

const seedDemoUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected for seeding demo users");

    for (const userData of demoUsers) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        user = new User(userData);
        await user.save();
        console.log(`🚀 Created demo ${userData.role} account: ${userData.email}`);
      } else {
        // Update user to ensure it's approved and has the correct role/details
        user.name = userData.name;
        user.password = userData.password; // Pre-save hook will hash it
        user.role = userData.role;
        user.status = "approved";
        user.rollNumber = userData.rollNumber;
        user.division = userData.division;
        await user.save();
        console.log(`🔄 Updated/Reset existing demo ${userData.role} account: ${userData.email}`);
      }
    }

    console.log("✅ Demo users seeding finished successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
};

seedDemoUsers();
