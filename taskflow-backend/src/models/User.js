const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "faculty", "admin"], default: "student" },
    rollNumber: { type: String, default: "" },
    division: { type: String, default: "A" },
    status: { 
      type: String, 
      enum: ["pending", "approved", "rejected"], 
      default: "approved" // Defaulting to approved for existing logic, but registration will set to pending
    },
    adaptiveProgress: {
      type: Map,
      of: String,
      default: {}
    }
  },

  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
