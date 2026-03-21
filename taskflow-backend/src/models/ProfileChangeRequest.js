const mongoose = require("mongoose");

const profileChangeRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedChanges: {
      name: { type: String },
      email: { type: String },
      rollNumber: { type: String },
      division: { type: String },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProfileChangeRequest", profileChangeRequestSchema);
