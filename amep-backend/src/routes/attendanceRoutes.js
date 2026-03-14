const router = require("express").Router();
const auth = require("../middleware/auth");
const AttendanceSession = require("../models/AttendanceSession");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

/**
 * Haversine formula — returns distance in metres between two lat/lng points
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371e3; // Earth radius in metres

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/attendance/start — faculty starts geo-fenced session
router.post("/start", auth, async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.body;

    // Deactivate any existing active sessions by this faculty
    await AttendanceSession.updateMany(
      { facultyId: req.user.id, active: true },
      { active: false }
    );

    const session = await AttendanceSession.create({
      facultyId: req.user.id,
      latitude,
      longitude,
      radius: radius || 50,
    });

    res.json({ success: true, session });
  } catch (err) {
    console.error("Start session error:", err);
    res.status(500).json({ success: false, message: "Failed to start session" });
  }
});

// POST /api/attendance/stop — faculty stops active session
router.post("/stop", auth, async (req, res) => {
  try {
    await AttendanceSession.updateMany(
      { facultyId: req.user.id, active: true },
      { active: false }
    );

    res.json({ success: true, message: "Session stopped" });
  } catch (err) {
    console.error("Stop session error:", err);
    res.status(500).json({ message: "Failed to stop session" });
  }
});

// POST /api/attendance/mark — student marks attendance
router.post("/mark", auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Find any active session
    const session = await AttendanceSession.findOne({ active: true });
    if (!session) {
      return res.status(400).json({ message: "No active attendance session right now" });
    }

    // Calculate distance
    const distance = haversineDistance(
      latitude,
      longitude,
      session.latitude,
      session.longitude
    );

    const distanceRounded = Math.round(distance);

    if (distance > session.radius) {
      return res.status(400).json({
        message: "You are too far from the classroom",
        details: `${distanceRounded}m away (allowed: ${session.radius}m)`,
      });
    }

    // Check if already marked for this session
    const existing = await Attendance.findOne({
      studentId: req.user.id,
      sessionId: session._id,
    });

    if (existing) {
      return res.status(400).json({ message: "Attendance already marked for this session" });
    }

    const attendance = await Attendance.create({
      studentId: req.user.id,
      sessionId: session._id,
      distance: distanceRounded,
    });

    res.json({ success: true, message: "Attendance marked!", distance: distanceRounded });
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
});

// GET /api/attendance/history — student attendance history
router.get("/history", auth, async (req, res) => {
  try {
    const history = await Attendance.find({ studentId: req.user.id })
      .sort({ date: -1 });

    res.json({ success: true, history });
  } catch (err) {
    console.error("Attendance history error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/attendance/summary — faculty summary stats
router.get("/summary", auth, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });

    // Count students who marked today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const presentToday = await Attendance.countDocuments({
      date: { $gte: todayStart, $lte: todayEnd },
    });

    res.json({ totalStudents, presentToday });
  } catch (err) {
    console.error("Attendance summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
