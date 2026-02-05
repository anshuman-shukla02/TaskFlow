const express = require("express");
const {
  getStudentBloomProgress,
  getClassPerformanceStats,
  getAllStudentsOverview,
  getStudentGrowthHistory,
  generateClassPerformanceReport
} = require("../controllers/analytics.controller");

const router = express.Router();

router.get("/student/bloom", getStudentBloomProgress);
router.get("/faculty/class-performance", getClassPerformanceStats);
router.get("/faculty/students-overview", getAllStudentsOverview);
router.get("/faculty/student-growth/:studentId", getStudentGrowthHistory);
router.post("/faculty/generate-ai-report", generateClassPerformanceReport);

module.exports = router;