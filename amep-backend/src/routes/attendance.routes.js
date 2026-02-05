const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  markAttendance,
  getAttendanceSummary,
  startSession,
  stopSession,
  getStudentHistory
} = require("../controllers/attendance.controller");

router.post("/mark", auth, markAttendance);
router.post("/start", auth, startSession);
router.post("/stop", auth, stopSession);
router.get("/summary", auth, getAttendanceSummary);
router.get("/history", auth, getStudentHistory);

module.exports = router;