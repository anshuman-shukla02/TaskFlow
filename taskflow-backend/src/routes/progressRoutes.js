const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");

// GET /api/progress — student's progress analytics
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const submissions = await Submission.find({ userId }).sort({ createdAt: 1 });

    if (submissions.length === 0) {
      return res.json({ success: true, data: null });
    }

    // Average score
    const totalScore = submissions.reduce((acc, s) => acc + s.performanceScore, 0);
    const avgScore = Math.round(totalScore / submissions.length);

    // Total tasks
    const totalTasks = submissions.length;

    // Top bloom level
    const bloomOrder = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];
    const bloomLevels = submissions.map((s) => s.bloomLevel).filter(Boolean);
    const topBloomLevel =
      bloomLevels.length > 0
        ? bloomLevels.reduce((a, b) =>
            bloomOrder.indexOf(a) >= bloomOrder.indexOf(b) ? a : b
          )
        : "N/A";

    // Recent scores for chart
    const recentScores = submissions.slice(-20).map((s) => ({
      date: s.createdAt.toISOString().split("T")[0],
      score: s.performanceScore,
    }));

    // Topic strengths
    const topicMap = {};
    submissions.forEach((s) => {
      if (!s.topic) return;
      if (!topicMap[s.topic]) topicMap[s.topic] = { total: 0, count: 0 };
      topicMap[s.topic].total += s.performanceScore;
      topicMap[s.topic].count++;
    });

    const topicStrengths = Object.entries(topicMap).map(([topic, data]) => ({
      _id: topic,
      avgScore: Math.round(data.total / data.count),
    }));

    res.json({
      success: true,
      data: {
        avgScore,
        totalTasks,
        topBloomLevel,
        recentScores,
        topicStrengths,
      },
    });
  } catch (err) {
    console.error("Progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/progress/reset — reset progress for a topic (proctoring penalty)
router.post("/reset", auth, async (req, res) => {
  try {
    const { topic } = req.body;

    // Penalize: reduce scores for this topic by 50%
    const submissions = await Submission.find({ userId: req.user.id, topic });

    for (const sub of submissions) {
      sub.performanceScore = Math.max(0, Math.floor(sub.performanceScore * 0.5));
      await sub.save();
    }

    res.json({ success: true, message: "Progress penalized for topic: " + topic });
  } catch (err) {
    console.error("Reset progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
