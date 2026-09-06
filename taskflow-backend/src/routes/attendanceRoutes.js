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

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Valid location coordinates required" });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find all active sessions created TODAY
    const activeSessions = await AttendanceSession.find({ 
      active: true,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    if (activeSessions.length === 0) {
      return res.status(400).json({ message: "No active attendance session right now" });
    }

    // Find the nearest session
    let nearestSession = null;
    let minDistance = Infinity;

    for (const s of activeSessions) {
      const d = haversineDistance(
        latitude,
        longitude,
        s.latitude,
        s.longitude
      );
      if (d < minDistance) {
        minDistance = d;
        nearestSession = s;
      }
    }

    if (!nearestSession || isNaN(minDistance)) {
      return res.status(400).json({ message: "Invalid location data" });
    }

    const distanceRounded = Math.round(minDistance);

    if (minDistance > nearestSession.radius) {
      return res.status(400).json({
        message: "You are too far from the classroom",
        details: `${distanceRounded}m away (allowed: ${nearestSession.radius}m)`,
      });
    }

    // Check if already marked TODAY (one attendance per student per day)
    const existing = await Attendance.findOne({
      studentId: req.user.id,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    if (existing) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    const attendance = await Attendance.create({
      studentId: req.user.id,
      sessionId: nearestSession._id,
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
    const totalStudents = await User.countDocuments({ role: "student", status: "approved" });

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

// GET /api/attendance/student/:studentId — faculty views a student's attendance
router.get("/student/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // All attendance records for this student
    const records = await Attendance.find({ studentId })
      .sort({ date: -1 });

    // Total sessions ever conducted (to compute attendance %)
    const totalSessions = await AttendanceSession.countDocuments();

    const attendedCount = records.length;
    const percentage = totalSessions > 0
      ? Math.round((attendedCount / totalSessions) * 100)
      : 0;

    res.json({
      success: true,
      records,
      totalSessions,
      attendedCount,
      percentage,
    });
  } catch (err) {
    console.error("Student attendance error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/attendance/active — faculty checks for their own active session
router.get("/active", auth, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const session = await AttendanceSession.findOne({
      facultyId: req.user.id,
      active: true,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });

    res.json({ success: true, session: session || null });
  } catch (err) {
    console.error("Active session check error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/attendance/daily-sheet — faculty exports full attendance roster for a date & division
router.get("/daily-sheet", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { division, date } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    const dayStart = new Date(queryDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(queryDate);
    dayEnd.setHours(23, 59, 59, 999);

    const studentFilter = { role: "student", status: "approved" };
    if (division && division !== "All") {
      studentFilter.division = division;
    }

    const students = await User.find(studentFilter)
      .select("name email rollNumber division")
      .sort({ division: 1, rollNumber: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    const attendances = await Attendance.find({
      studentId: { $in: studentIds },
      date: { $gte: dayStart, $lte: dayEnd },
    }).lean();

    const attendanceMap = {};
    attendances.forEach((a) => {
      attendanceMap[a.studentId.toString()] = a;
    });

    const roster = students.map((s) => {
      const record = attendanceMap[s._id.toString()];
      return {
        _id: s._id,
        name: s.name,
        rollNumber: s.rollNumber || "N/A",
        division: s.division || "N/A",
        email: s.email,
        status: record ? "Present" : "Absent",
        distance: record?.distance != null ? `${record.distance}m` : "-",
        markedAt: record?.date ? new Date(record.date).toLocaleTimeString() : "-",
      };
    });

    res.json({
      success: true,
      date: dayStart.toISOString().slice(0, 10),
      division: division || "All",
      totalStudents: students.length,
      presentCount: attendances.length,
      roster,
    });
  } catch (err) {
    console.error("Daily attendance sheet error:", err);
    res.status(500).json({ message: "Failed to generate attendance sheet" });
  }
});

module.exports = router;
