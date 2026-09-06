const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Task = require("../models/Task");
const User = require("../models/User");
const Badge = require("../models/Badge");

/* ─── Badge Metadata ─────────────────────────────────────────── */
const BADGE_INFO = {
  FIRST_SUBMISSION:  { name: "First Steps",      icon: "🏆", description: "Submitted your first task" },
  STREAK_7:          { name: "On Fire",           icon: "🔥", description: "7-day submission streak" },
  PERFECT_SCORE:     { name: "Perfectionist",     icon: "⭐", description: "Scored 100% on a marked task" },
  ALL_TASKS_COMPLETE:{ name: "Completionist",     icon: "🎯", description: "Completed all assigned tasks" },
  TOP_PERFORMER:     { name: "Top Performer",     icon: "🚀", description: "Highest average score in division" },
  FAST_LEARNER:      { name: "Speed Demon",       icon: "⚡", description: "Completed 5 tasks in one day" },
  AI_ACHIEVER:       { name: "AI Star",           icon: "🤖", description: "AI evaluation score > 90%" },
  ADAPTIVE_MASTER:   { name: "Knowledge Master",  icon: "🧠", description: "Completed all adaptive topics" },
};

/* ─── Helper: Award a badge (idempotent — won't duplicate) ─── */
async function awardBadge(userId, type, metadata = {}) {
  try {
    await Badge.create({ userId, type, metadata });
    console.log(`🏅 Badge awarded: ${type} to user ${userId}`);
    return true;
  } catch (err) {
    // Duplicate key = already has this badge — that's fine
    if (err.code === 11000) return false;
    console.error(`Badge award error (${type}):`, err.message);
    return false;
  }
}

/* ─── Core: Evaluate badges for a user ──────────────────────── */
async function evaluateBadges(userId) {
  const awarded = [];

  const [submissions, allTasks, user] = await Promise.all([
    Submission.find({ userId }).sort({ createdAt: 1 }).lean(),
    Task.find({}).lean(),
    User.findById(userId).lean(),
  ]);

  if (!user || submissions.length === 0) return awarded;

  // 1. FIRST_SUBMISSION — first ever submission
  if (submissions.length >= 1) {
    if (await awardBadge(userId, "FIRST_SUBMISSION", { taskTitle: submissions[0].taskId })) {
      awarded.push("FIRST_SUBMISSION");
    }
  }

  // 2. STREAK_7 — 7 consecutive days with at least one submission
  const submissionDays = [...new Set(
    submissions.map((s) => new Date(s.createdAt).toISOString().slice(0, 10))
  )].sort();

  let maxStreak = 1, currentStreak = 1;
  for (let i = 1; i < submissionDays.length; i++) {
    const prevDate = new Date(submissionDays[i - 1]);
    const currDate = new Date(submissionDays[i]);
    const diffDays = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  if (maxStreak >= 7) {
    if (await awardBadge(userId, "STREAK_7", { streak: maxStreak })) {
      awarded.push("STREAK_7");
    }
  }

  // 3. PERFECT_SCORE — 100% on any marked task
  const scoredSubs = submissions.filter((s) => s.countForProgress);
  for (const sub of scoredSubs) {
    if (sub.performanceScore >= 10) { // 10/10 scale
      if (await awardBadge(userId, "PERFECT_SCORE", { score: sub.performanceScore })) {
        awarded.push("PERFECT_SCORE");
      }
      break;
    }
  }

  // 4. FAST_LEARNER — 5+ submissions in a single day
  const daySubmissionCounts = {};
  submissions.forEach((s) => {
    const day = new Date(s.createdAt).toISOString().slice(0, 10);
    daySubmissionCounts[day] = (daySubmissionCounts[day] || 0) + 1;
  });
  const hasFastDay = Object.values(daySubmissionCounts).some((count) => count >= 5);
  if (hasFastDay) {
    if (await awardBadge(userId, "FAST_LEARNER")) {
      awarded.push("FAST_LEARNER");
    }
  }

  // 5. AI_ACHIEVER — AI suggested score >= 9/10
  const aiHighScoreSub = submissions.find(
    (s) => s.aiEvaluation && s.aiEvaluation.suggestedScore >= 9
  );
  if (aiHighScoreSub) {
    if (await awardBadge(userId, "AI_ACHIEVER", { score: aiHighScoreSub.aiEvaluation.suggestedScore })) {
      awarded.push("AI_ACHIEVER");
    }
  }

  // 6. ALL_TASKS_COMPLETE — submitted all tasks (non-project)
  const regularTasks = allTasks.filter((t) => t.type !== "project");
  if (regularTasks.length > 0) {
    const submittedTaskIds = new Set(
      submissions
        .filter((s) => s.milestoneId == null)
        .map((s) => s.taskId?.toString())
    );
    const allDone = regularTasks.every((t) => submittedTaskIds.has(t._id.toString()));
    if (allDone) {
      if (await awardBadge(userId, "ALL_TASKS_COMPLETE", { taskCount: regularTasks.length })) {
        awarded.push("ALL_TASKS_COMPLETE");
      }
    }
  }

  // 7. ADAPTIVE_MASTER — completed all adaptive topics
  const adaptiveMap = user.adaptiveProgress || {};
  const TOPIC_IDS = ["arrays", "strings", "linked-lists", "stacks-queues", "trees", "graphs", "dynamic-programming"];
  const allAdaptiveDone = TOPIC_IDS.every((id) => {
    const state = adaptiveMap[id] || adaptiveMap.get?.(id);
    return state === "completed";
  });
  if (allAdaptiveDone) {
    if (await awardBadge(userId, "ADAPTIVE_MASTER")) {
      awarded.push("ADAPTIVE_MASTER");
    }
  }

  return awarded;
}

/* ─── GET /api/gamification/leaderboard ────────────────────── */
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const { division } = req.query;

    // Build student filter
    const studentFilter = { role: "student", status: "approved" };
    if (division && division !== "All") {
      studentFilter.division = division;
    }

    const students = await User.find(studentFilter)
      .select("_id name email rollNumber division")
      .lean();

    const studentIds = students.map((s) => s._id);

    // Aggregate scores — only countForProgress submissions
    const pipeline = [
      { $match: { userId: { $in: studentIds }, countForProgress: true } },
      {
        $group: {
          _id: "$userId",
          avgScore: { $avg: "$performanceScore" },
          totalSubmissions: { $sum: 1 },
          totalScore: { $sum: "$performanceScore" },
        },
      },
      { $sort: { avgScore: -1 } },
    ];

    const scoreData = await Submission.aggregate(pipeline);
    const scoreMap = {};
    scoreData.forEach((s) => {
      scoreMap[s._id.toString()] = {
        avgScore: Math.round(s.avgScore * 10) / 10,
        totalSubmissions: s.totalSubmissions,
        totalScore: s.totalScore,
      };
    });

    // Get badge counts
    const badgeCounts = await Badge.aggregate([
      { $match: { userId: { $in: studentIds } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);
    const badgeCountMap = {};
    badgeCounts.forEach((b) => {
      badgeCountMap[b._id.toString()] = b.count;
    });

    // Build leaderboard
    const leaderboard = students
      .map((student) => ({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber,
        division: student.division,
        avgScore: scoreMap[student._id.toString()]?.avgScore || 0,
        totalSubmissions: scoreMap[student._id.toString()]?.totalSubmissions || 0,
        badgeCount: badgeCountMap[student._id.toString()] || 0,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    res.json({ success: true, leaderboard });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

/* ─── GET /api/gamification/badges/:userId ─────────────────── */
router.get("/badges/:userId", auth, async (req, res) => {
  try {
    const badges = await Badge.find({ userId: req.params.userId })
      .sort({ awardedAt: -1 })
      .lean();

    const enriched = badges.map((b) => ({
      ...b,
      ...(BADGE_INFO[b.type] || {}),
    }));

    res.json({ success: true, badges: enriched });
  } catch (err) {
    console.error("Get badges error:", err);
    res.status(500).json({ message: "Failed to fetch badges" });
  }
});

/* ─── GET /api/gamification/my-badges ──────────────────────── */
router.get("/my-badges", auth, async (req, res) => {
  try {
    const badges = await Badge.find({ userId: req.user.id })
      .sort({ awardedAt: -1 })
      .lean();

    const enriched = badges.map((b) => ({
      ...b,
      ...(BADGE_INFO[b.type] || {}),
    }));

    res.json({ success: true, badges: enriched });
  } catch (err) {
    console.error("Get my badges error:", err);
    res.status(500).json({ message: "Failed to fetch badges" });
  }
});

/* ─── POST /api/gamification/evaluate ──────────────────────── */
router.post("/evaluate", auth, async (req, res) => {
  try {
    const awarded = await evaluateBadges(req.user.id);
    res.json({ success: true, awarded });
  } catch (err) {
    console.error("Badge evaluation error:", err);
    res.status(500).json({ message: "Badge evaluation failed" });
  }
});

// Export both the router and the helper for use in submissionRoutes
module.exports = router;
module.exports.evaluateBadges = evaluateBadges;
