const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("./src/models/User");
const StudyMaterial = require("./src/models/StudyMaterial");

require("dotenv").config();

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/amep");
    
    const faculty = await User.findOne({ email: "faculty01@taskflow.com" });
    if (!faculty) {
      console.log("Faculty not found, creating dummy material under first faculty...");
    }

    const uploadDir = path.join(__dirname, "src/uploads/materials");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const sourcePath = "/Users/ansh/Desktop/TASKFLOW/dummy_notes.txt";
    const destName = "material-" + Date.now() + ".txt";
    const destPath = path.join(uploadDir, destName);
    
    fs.copyFileSync(sourcePath, destPath);

    const uploaderId = faculty ? faculty._id : (await User.findOne({role: "faculty"}))._id;

    await StudyMaterial.create({
      title: "Array Notes (Seeded)",
      description: "Notes on array data structures.",
      subject: "Data Structures",
      fileUrl: "http://localhost:5002/uploads/materials/" + destName,
      originalName: "dummy_notes.txt",
      fileType: "txt",
      fileSize: fs.statSync(destPath).size,
      uploadedBy: uploaderId
    });

    console.log("Successfully seeded material!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
