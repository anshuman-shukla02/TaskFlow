const Submission = require("../models/Submission");
const mongoose = require("mongoose");

/**
 * Helper: Convert retention enum to human-readable label
 */
const formatStatus = (status) => {
  switch (status) {
    case "NOT_UNLOCKED":
      return "Not Unlocked";
    case "NEEDS_REVISION":
      return "Needs Revision";
    case "IMPROVING":
      return "Improving";
    case "GOOD_PERFORMANCE":
      return "Good Performance";
    default:
      return status;
  }
};

/**
 * 1️⃣ OVERVIEW API
 * Shows where the student currently is
 */
exports.getOverview = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const totalAttempts = await Submission.countDocuments({ userId });

    const lastSubmission = await Submission.findOne({ userId })
      .sort({ createdAt: -1 });

    res.json({
      totalAttempts,
      currentTopic: lastSubmission ? lastSubmission.topic : "arrays",
      currentDifficulty: lastSubmission ? lastSubmission.difficulty : "easy"
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 2️⃣ TOPIC-WISE PERFORMANCE + RETENTION
 * Includes NOT_UNLOCKED topics
 */
exports.getTopicWisePerformance = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    /**
     * Define all supported topics here
     * (single source of truth)
     */
    const ALL_TOPICS = [
      "arrays",
      "strings",
      "linked_list",
      "stack",
      "searching"
    ];

    // Aggregate attempted topics
    const attemptedData = await Submission.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$topic",
          avgScore: { $avg: "$performanceScore" },
          attempts: { $sum: 1 }
        }
      },
      {
        $project: {
          topic: "$_id",
          avgScore: { $round: ["$avgScore", 1] },
          attempts: 1,
          _id: 0
        }
      }
    ]);

    // Convert to map for quick lookup
    const attemptedMap = {};
    attemptedData.forEach(item => {
      attemptedMap[item.topic] = item;
    });

    // Build final response with retention logic
    const result = ALL_TOPICS.map(topic => {
      const item = attemptedMap[topic];

      // Topic not attempted yet
      if (!item) {
        return {
          topic,
          avgScore: 0,
          attempts: 0,
          retentionStatus: "NOT_UNLOCKED",
          retentionLabel: formatStatus("NOT_UNLOCKED")
        };
      }

      let retentionStatus;
      if (item.avgScore < 50) {
        retentionStatus = "NEEDS_REVISION";
      } else if (item.avgScore < 75) {
        retentionStatus = "IMPROVING";
      } else {
        retentionStatus = "GOOD_PERFORMANCE";
      }

      return {
        ...item,
        retentionStatus,
        retentionLabel: formatStatus(retentionStatus)
      };
    });

    res.json(result);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 3️⃣ DIFFICULTY-WISE QUALITY
 * (Average score, not attempt count)
 */
exports.getDifficultyWisePerformance = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    const data = await Submission.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$difficulty",
          avgScore: { $avg: "$performanceScore" }
        }
      },
      {
        $project: {
          difficulty: "$_id",
          avgScore: { $round: ["$avgScore", 1] },
          _id: 0
        }
      }
    ]);

    res.json(data);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 4️⃣ RESET PROGRESS (PENALTY)
 * Called when proctoring violation occurs
 */
exports.resetProgress = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const { topic } = req.body;

    // Create a penalty submission (0 score)
    // We assume a generic 'cheating-penalty' task ID or just skip foreign key check if possible,
    // but better to just log a submission with metadata.
    // Since we are strict on Schema, let's find ANY task for this topic to link to, or create a dummy one.
    // For simplicity, we just create a submission with a score of 0.

    // Find a task for this topic to link to (so Schema doesn't break)
    const task = await mongoose.model("Task").findOne({ topic });

    if (!task) {
      // If no task exists, we can't create a submission easily due to schema constraints.
      // In a real app we'd have a specific "Penalty" task. 
      // For now, we return success but maybe just log it.
      return res.json({ message: "No task found to penalize, but session terminated." });
    }

    await Submission.create({
      userId,
      taskId: task._id,
      topic: topic,
      difficulty: "medium", // Default
      bloomLevel: "APPLY",
      code: "SESSION TERMINATED - CHEATING DETECTED",
      isCorrect: false,
      performanceScore: 0, // PENALTY
      timeTaken: 0,
      hintsUsed: 0,
      fileUrl: null
    });

    res.json({ message: "Progress reset (penalty applied)." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 5️⃣ COMBINED PROGRESS FOR FRONTEND ANALYTICS PAGE
 */
exports.getCombinedProgress = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // 1. Overall Stats
    const totalTasks = await Submission.countDocuments({ userId });

    // Average Score
    const avgData = await Submission.aggregate([
      { $match: { userId } },
      { $group: { _id: null, avg: { $avg: "$performanceScore" } } }
    ]);
    const avgScore = avgData.length ? Math.round(avgData[0].avg) : 0;

    // Top Bloom Level (Mode)
    const bloomData = await Submission.aggregate([
      { $match: { userId } },
      { $group: { _id: "$bloomLevel", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 }
    ]);
    const topBloomLevel = bloomData.length ? bloomData[0]._id : "N/A";

    // 2. Recent Scores (Growth Curve)
    const recentScores = await Submission.find({ userId })
      .sort({ createdAt: 1 }) // Oldest first for line chart
      .select("createdAt performanceScore")
      .limit(20);

    const formattedRecent = recentScores.map(s => ({
      date: s.createdAt.toISOString().split('T')[0],
      score: s.performanceScore
    }));

    // 3. Topic Strengths
    const topicStrengths = await Submission.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$topic",
          avgScore: { $avg: "$performanceScore" },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgScore: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        avgScore,
        totalTasks,
        topBloomLevel,
        recentScores: formattedRecent,
        topicStrengths
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};