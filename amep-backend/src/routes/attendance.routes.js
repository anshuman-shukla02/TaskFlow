const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  markAttendance,
  getAttendanceSummary,
} = require("../controllers/attendance.controller");

router.post("/mark", auth, markAttendance);
router.get("/summary", auth, getAttendanceSummary);

module.exports = router;