const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  getOverview,
  getTopicWisePerformance,
  getDifficultyWisePerformance,
  resetProgress,
  getCombinedProgress
} = require("../controllers/progress.controller");

router.get("/overview", auth, getOverview);
router.get("/", auth, getCombinedProgress); // ✅ NEW: Main analytics endpoint
router.get("/topic-wise", auth, getTopicWisePerformance);
router.get("/difficulty-wise", auth, getDifficultyWisePerformance);
router.post("/reset", auth, resetProgress); // ✅ NEW

module.exports = router;