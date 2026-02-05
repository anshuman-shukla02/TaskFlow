const Attendance = require("../models/Attendance");

const ClassSession = require("../models/ClassSession");

// Haversine Formula for distance (in meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * 1️⃣ Start Session (Faculty)
 */
exports.startSession = async (req, res) => {
  try {
    console.log("START SESSION REQUEST:", req.body);
    console.log("USER:", req.user);
    const { latitude, longitude, radius } = req.body;
    const facultyId = req.user.userId;

    // Deactivate previous sessions
    await ClassSession.updateMany({ facultyId, isActive: true }, { isActive: false });

    const session = await ClassSession.create({
      facultyId,
      latitude,
      longitude,
      radius: radius || 50
    });

    res.json({ success: true, message: "Attendance session started", session });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 2️⃣ Stop Session (Faculty)
 */
exports.stopSession = async (req, res) => {
  try {
    const facultyId = req.user.userId;
    await ClassSession.updateMany({ facultyId, isActive: true }, { isActive: false });
    res.json({ success: true, message: "Attendance session stopped" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 3️⃣ Mark Attendance (Student) - Geo Validated
 */
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude } = req.body;
    const today = new Date().toISOString().slice(0, 10);

    // Find active session
    const session = await ClassSession.findOne({ isActive: true }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({ message: "No active attendance session found" });
    }

    // Validate Distance
    const distance = getDistance(latitude, longitude, session.latitude, session.longitude);
    console.log(`[Attendance] Dist: ${distance.toFixed(2)}m (Max: ${session.radius}m)`);

    if (distance > session.radius) {
      return res.status(400).json({
        message: "You are too far from the class!",
        details: `Distance: ${Math.round(distance)}m`
      });
    }

    // Mark present
    await Attendance.findOneAndUpdate(
      { userId, date: today },
      {
        present: true,
        sessionId: session._id,
        location: { latitude, longitude }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: "Attendance marked successfully!", distance: Math.round(distance) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Attendance summary (teacher)
 */
exports.getAttendanceSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalPresent = await Attendance.countDocuments({
      date: today,
      present: true,
    });

    const totalStudents = await Attendance.distinct("userId");

    res.json({
      date: today,
      totalStudents: totalStudents.length,
      presentToday: totalPresent,
      absentToday: totalStudents.length - totalPresent,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 4️⃣ Get Student Attendance History
 */
exports.getStudentHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const history = await Attendance.find({ userId, present: true })
      .select("date sessionId")
      .sort({ date: -1 });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};