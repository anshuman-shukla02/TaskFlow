const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const TopicProgress = require("../models/TopicProgress");
const { difficultyOrder } = require("../utils/progressionRules");

const TOPIC_SEQUENCE = ["arrays", "strings"]; // extend later

const getNextTopic = (currentTopic) => {
  const idx = TOPIC_SEQUENCE.indexOf(currentTopic);
  return TOPIC_SEQUENCE[idx + 1] || null;
};

exports.getNextProblem = async (req, res) => {
  try {
    const userId = req.user.userId;

    // 1️⃣ Last submission
    const lastSubmission = await Submission.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate("problemId");

    let topic = "arrays";
    let difficulty = "easy";
    let orderQuery = {};

    if (lastSubmission) {
      topic = lastSubmission.topic;
      difficulty = lastSubmission.difficulty;

      // 2️⃣ Check topic completion
      const totalProblems = await Problem.countDocuments({ topic });

      const attemptedProblems = await Submission.distinct("problemId", {
        userId,
        topic,
      });

      if (attemptedProblems.length >= totalProblems) {
        const nextTopic = getNextTopic(topic);

        if (!nextTopic) {
          return res.json({ message: "All topics completed 🎉" });
        }

        topic = nextTopic;
        difficulty = "easy";
        orderQuery = {};
      } else if (lastSubmission.performanceScore >= 70) {
        const currentIndex = difficultyOrder.indexOf(difficulty);
        if (currentIndex < difficultyOrder.length - 1) {
          difficulty = difficultyOrder[currentIndex + 1];
        }
      } else {
        orderQuery = { order: { $gt: lastSubmission.problemId.order } };
      }
    }

    // 3️⃣ Notes lock check
    const topicProgress = await TopicProgress.findOne({ userId, topic });
    if (!topicProgress || !topicProgress.notesViewed) {
      return res.json({
        message: "Please view topic notes before solving questions",
        nextAction: "VIEW_NOTES",
        topic,
      });
    }

    // 4️⃣ Fetch next problem
    let nextProblem = await Problem.findOne({
      topic,
      difficulty,
      ...orderQuery,
    }).sort({ order: 1 });

    // 5️⃣ Fallback (same difficulty, reset order)
    if (!nextProblem) {
      nextProblem = await Problem.findOne({ topic, difficulty }).sort({
        order: 1,
      });
    }

    if (!nextProblem) {
      return res.json({ message: "No problem found" });
    }

    res.json(nextProblem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};