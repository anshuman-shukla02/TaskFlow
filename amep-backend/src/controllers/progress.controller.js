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