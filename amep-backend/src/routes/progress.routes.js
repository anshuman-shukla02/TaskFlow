const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");

const {
  getOverview,
  getTopicWisePerformance,
  getDifficultyWisePerformance
} = require("../controllers/progress.controller");

router.get("/overview", auth, getOverview);
router.get("/topic-wise", auth, getTopicWisePerformance);
router.get("/difficulty-wise", auth, getDifficultyWisePerformance);

module.exports = router;