const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

const StudyMaterial = require('./src/models/StudyMaterial');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const faculty = await User.findOne({ email: "faculty01@taskflow.com" });
    const materials = await StudyMaterial.find({});
    
    if (materials.length > 0) {
      const mat = materials[0];
      console.log("Found material:", mat.title);
      console.log("Material uploadedBy:", mat.uploadedBy.toString());
      console.log("Faculty ID:", faculty._id.toString());
      console.log("Match:", mat.uploadedBy.toString() === faculty._id.toString());
    } else {
      console.log("No materials found in DB.");
    }
    process.exit();
  })
  .catch(err => {
    console.error(err);
    process.exit();
  });
