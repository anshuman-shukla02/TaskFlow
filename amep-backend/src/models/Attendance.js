const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: true,
    },
    present: {
      type: Boolean,
      default: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSession",
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance for same day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);