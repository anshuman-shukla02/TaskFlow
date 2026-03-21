const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema(
  {
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radius: { type: Number, default: 50 }, // metres
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
