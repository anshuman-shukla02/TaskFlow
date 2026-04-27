const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Task = require("../models/Task");
const User = require("../models/User");
const fs = require("fs");
const path = require("path");

/* ─── helpers ─────────────────────────────────────────────────── */

const TOPIC_LABELS = {
  "arrays":              "Arrays",
  "strings":             "Strings",
  "linked-lists":        "Linked Lists",
  "stacks-queues":       "Stacks & Queues",
  "trees":               "Trees",
  "graphs":              "Graphs",
  "dynamic-programming": "Dynamic Programming",
};

function getTopicQuestionCount(topicId) {
  const filePath = path.join(__dirname, "../data/questions", `${topicId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const qs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return Array.isArray(qs) ? qs.length : 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

let questionsCache = {};

function getTopicQuestions(topicId) {
  if (questionsCache[topicId]) return questionsCache[topicId];

  const filePath = path.join(__dirname, "../data/questions", `${topicId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const qs = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const result = Array.isArray(qs) ? qs : [];
      questionsCache[topicId] = result;
      return result;
    } catch {
      return [];
    }
  }
  return [];
}

/** Number of questions the student has completed in a topic based on their saved progress. */
function questionsCompletedForTopic(topicId, savedState, questions) {
  if (!savedState) return 0;
  if (savedState === "completed") return questions.length;
  const idx = questions.findIndex((q) => q.id === savedState);
  // They've answered all questions BEFORE the saved one (saved = current)
  return idx > 0 ? idx : 0;
}

/* ─── GET /api/progress ─────────────────────────────────────────── */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [user, submissions, allTasks] = await Promise.all([
      User.findById(userId).lean(),
      Submission.find({ userId }).sort({ createdAt: 1 }).lean(),
      Task.find({}).lean(),
    ]);

    // Only count submissions from tasks that have marks enabled
    const scoredSubmissions = submissions.filter(s => s.countForProgress);

    /* ── Adaptive Learning stats ── */
    const adaptiveProgressMap = user.adaptiveProgress || new Map();
    const allTopicIds = Object.keys(TOPIC_LABELS);

    const adaptiveStats = allTopicIds.map((topicId) => {
      const questions = getTopicQuestions(topicId);
      const totalQuestions = questions.length;
      const savedState = adaptiveProgressMap.get
        ? adaptiveProgressMap.get(topicId)
        : (adaptiveProgressMap[topicId] || null);

      const questionsCompleted = questionsCompletedForTopic(
        topicId,
        savedState,
        questions
      );
      const percent =
        totalQuestions > 0
          ? Math.round((questionsCompleted / totalQuestions) * 100)
          : 0;

      return {
        topicId,
        topicName: TOPIC_LABELS[topicId],
        questionsCompleted,
        totalQuestions,
        percent,
        completed: savedState === "completed",
      };
    });

    const adaptiveOverall =
      adaptiveStats.length > 0
        ? Math.round(
            adaptiveStats.reduce((acc, t) => acc + t.percent, 0) /
              adaptiveStats.length
          )
        : 0;

    /* ── Task stats ── */
    const regularTasks = allTasks.filter((t) => t.type === "task");
    const totalTasks = regularTasks.length;
    const submittedTaskIds = new Set(
      submissions
        .filter((s) => s.taskId && !s.milestoneId)
        .map((s) => s.taskId?.toString())
    );
    const tasksSubmitted = submittedTaskIds.size;
    const taskRatio =
      totalTasks > 0 ? Math.round((tasksSubmitted / totalTasks) * 100) : 0;

    /* ── Project (milestone) stats ── */
    const projectTasks = allTasks.filter((t) => t.type === "project");
    const totalMilestones = projectTasks.reduce(
      (acc, t) => acc + (t.phases?.length || 0),
      0
    );
    const approvedMilestones = submissions.filter(
      (s) => s.milestoneId != null && s.reviewStatus === "APPROVED"
    ).length;
    const projectRatio =
      totalMilestones > 0
        ? Math.round((approvedMilestones / totalMilestones) * 100)
        : 0;

    /* ── Overall weighted score (Adaptive 40% + Tasks 35% + Projects 25%) ── */
    const overallScore = Math.round(
      adaptiveOverall * 0.4 + taskRatio * 0.35 + projectRatio * 0.25
    );

    /* ── Existing analytics (only scored/marked submissions) ── */
    let avgScore = 0;
    let topBloomLevel = "N/A";
    let recentScores = [];
    let topicStrengths = [];

    // recentScores shows all submissions so student can see their history
    recentScores = submissions.slice(-20).map((s) => ({
      date: s.createdAt.toISOString().split("T")[0],
      score: s.performanceScore,
    }));

    if (scoredSubmissions.length > 0) {
      const totalScore = scoredSubmissions.reduce(
        (acc, s) => acc + s.performanceScore,
        0
      );
      avgScore = Math.round(totalScore / scoredSubmissions.length);

      const bloomOrder = [
        "REMEMBER","UNDERSTAND","APPLY","ANALYZE","EVALUATE","CREATE",
      ];
      const bloomLevels = scoredSubmissions.map((s) => s.bloomLevel).filter(Boolean);
      topBloomLevel =
        bloomLevels.length > 0
          ? bloomLevels.reduce((a, b) =>
              bloomOrder.indexOf(a) >= bloomOrder.indexOf(b) ? a : b
            )
          : "N/A";

      const topicMap = {};
      scoredSubmissions.forEach((s) => {
        if (!s.topic) return;
        if (!topicMap[s.topic]) topicMap[s.topic] = { total: 0, count: 0 };
        topicMap[s.topic].total += s.performanceScore;
        topicMap[s.topic].count++;
      });

      topicStrengths = Object.entries(topicMap).map(([topic, data]) => ({
        _id: topic,
        avgScore: Math.round(data.total / data.count),
      }));
    }

    /* ── Recent task submissions with score breakdown (marked tasks only) ── */
    const recentTaskSubmissions = await Submission.find({
      userId,
      taskId: { $ne: null },
      milestoneId: null,
      countForProgress: true,
    })
      .populate("taskId", "title topic difficulty hasMarks")
      .sort({ createdAt: -1 })
      .limit(10);

    const taskScoreHistory = recentTaskSubmissions.map((s) => ({
      title: s.taskId?.title || "Task",
      topic: s.taskId?.topic || s.topic || "",
      score: s.performanceScore,
      date: s.createdAt.toISOString().split("T")[0],
    }));

    res.json({
      success: true,
      data: {
        overallScore,
        avgScore,
        totalTasks,
        tasksSubmitted,
        taskRatio,
        totalMilestones,
        approvedMilestones,
        projectRatio,
        adaptiveOverall,
        adaptiveStats,
        topBloomLevel,
        recentScores,
        topicStrengths,
        taskScoreHistory,
      },
    });
  } catch (err) {
    console.error("Progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─── GET /api/progress/dashboard-summary ────────────────────── */
router.get("/dashboard-summary", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const submissions = await Submission.find({ userId }).sort({ createdAt: 1 });

    if (submissions.length === 0) {
      return res.json({
        success: true,
        progressData: [],
        topicPerformance: [],
      });
    }

    /* Weekly score averages */
    const weeklyMap = {};
    submissions.forEach((s) => {
      const week = getWeekNumber(s.createdAt);
      const key = `W${week}`;
      if (!weeklyMap[key]) weeklyMap[key] = { total: 0, count: 0 };
      weeklyMap[key].total += s.performanceScore;
      weeklyMap[key].count++;
    });

    const progressData = Object.entries(weeklyMap)
      .slice(-8)
      .map(([week, data]) => ({
        week,
        score: Math.round(data.total / data.count),
      }));

    /* Topic-wise average performance */
    const topicMap = {};
    submissions.forEach((s) => {
      if (!s.topic) return;
      if (!topicMap[s.topic]) topicMap[s.topic] = { total: 0, count: 0 };
      topicMap[s.topic].total += s.performanceScore;
      topicMap[s.topic].count++;
    });

    const topicPerformance = Object.entries(topicMap).map(
      ([topic, data]) => ({
        topic,
        value: Math.round(data.total / data.count),
      })
    );

    res.json({ success: true, progressData, topicPerformance });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ─── POST /api/progress/reset ─────────────────────────────── */
router.post("/reset", auth, async (req, res) => {
  try {
    const { topic } = req.body;
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

/* ─── helper ─────────────────────────────────────────────────── */
function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = router;
