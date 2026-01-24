const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const evaluateSubmission = require("../utils/evaluateSubmission");

exports.submitSolution = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { problemId, code, hintsUsed, timeTaken } = req.body;

    if (!problemId || !code || hintsUsed === undefined || !timeTaken) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const { isCorrect, performanceScore } = await evaluateSubmission({
      problem,
      code,
      hintsUsed,
      timeTaken
    });

    const submission = await Submission.create({
      userId,
      problemId,
      topic: problem.topic,
      difficulty: problem.difficulty,
      code,
      isCorrect,
      performanceScore,
      timeTaken,
      hintsUsed
    });

    res.status(201).json({
      message: "Submission evaluated",
      isCorrect,
      performanceScore
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};