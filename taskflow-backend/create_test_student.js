const mongoose = require("mongoose");
const User = require("./src/models/User");
require("dotenv").config();

async function createTestStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/amep");
    
    const email = "student@test.com";
    const password = "password123";
    
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        name: "Test Student",
        email: email,
        password: password,
        role: "student",
        rollNumber: "CS101",
        division: "A"
      });
      await user.save();
      console.log("Created new test student.");
    } else {
      user.password = password;
      await user.save();
      console.log("Reset password for existing test student.");
    }
    
    console.log(`\n--- STUDENT CREDENTIALS ---`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: student`);
    console.log(`---------------------------\n`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}

createTestStudent();
