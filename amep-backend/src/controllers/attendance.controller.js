const Attendance = require("../models/Attendance");

/**
 * Mark attendance (student)
 */
exports.markAttendance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    await Attendance.findOneAndUpdate(
      { userId, date },
      { present: true },
      { upsert: true, new: true }
    );

    res.json({ message: "Attendance marked" });
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