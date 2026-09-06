const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const User = require("../models/User");
const { generateContentWithFallback } = require("../utils/gemini");

const PLAGIARISM_THRESHOLD = 80; // Flag if similarity > 80%

/**
 * Extract text content from a submission for comparison.
 * Handles code, questionAnswers, and file-based submissions.
 */
function extractSubmissionText(sub) {
  let text = "";

  // Code / plain text
  if (sub.code && sub.code.trim()) {
    text += sub.code.trim();
  }

  // Question-based answers
  if (Array.isArray(sub.questionAnswers) && sub.questionAnswers.length > 0) {
    text += "\n" + sub.questionAnswers
      .map((qa) => `Q${qa.questionIndex}: ${qa.answer || ""}`)
      .join("\n");
  }

  return text.trim();
}

// POST /api/plagiarism/check/:submissionId — faculty triggers check for a submission
router.post("/check/:submissionId", auth, async (req, res) => {
  try {
    // Only faculty/admin can trigger checks
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const submission = await Submission.findById(req.params.submissionId)
      .populate("userId", "name");
    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    const targetText = extractSubmissionText(submission);
    if (!targetText) {
      return res.status(400).json({
        message: "Submission has no text content to check for plagiarism.",
      });
    }

    // Find all OTHER submissions for the same task
    const otherSubs = await Submission.find({
      taskId: submission.taskId,
      _id: { $ne: submission._id },
      userId: { $ne: submission.userId._id },
    }).populate("userId", "name");

    if (otherSubs.length === 0) {
      // No other submissions to compare against
      submission.plagiarismCheck = {
        score: 0,
        flagged: false,
        matchedWith: null,
        matchedStudentName: "",
        summary: "No other submissions found for this task to compare against.",
        checkedAt: new Date(),
      };
      await submission.save();
      return res.json({ success: true, result: submission.plagiarismCheck });
    }

    // Compare against each other submission using Gemini
    let highestScore = 0;
    let bestMatch = null;
    let bestSummary = "";
    let bestMatchName = "";

    // To avoid excessive API calls, compare against up to 10 submissions
    const subsToCheck = otherSubs.slice(0, 10);

    for (const otherSub of subsToCheck) {
      const otherText = extractSubmissionText(otherSub);
      if (!otherText) continue;

      try {
        const prompt = `You are an academic plagiarism detection system. Compare these two student submissions and determine how similar they are.

SUBMISSION A (by ${submission.userId?.name || "Student A"}):
---
${targetText.substring(0, 3000)}
---

SUBMISSION B (by ${otherSub.userId?.name || "Student B"}):
---
${otherText.substring(0, 3000)}
---

Respond ONLY with valid JSON (no markdown, no explanation outside JSON):
{
  "similarityScore": <number 0-100>,
  "isLikelyCopied": <boolean>,
  "explanation": "<brief explanation of what is similar or different>"
}

Rules:
- 0 = completely different
- 100 = identical copy
- Consider structural similarity, variable naming, logic flow
- Minor formatting differences should not reduce the score significantly
- Score 80+ means likely plagiarism`;

        const { text: rawResponse } = await generateContentWithFallback({
          prompt,
          jsonMode: true,
        });

        const result = JSON.parse(rawResponse);
        const score = Math.min(100, Math.max(0, Number(result.similarityScore) || 0));

        if (score > highestScore) {
          highestScore = score;
          bestMatch = otherSub._id;
          bestMatchName = otherSub.userId?.name || "Unknown";
          bestSummary = result.explanation || "";
        }
      } catch (aiErr) {
        console.warn(`Plagiarism check AI error for pair:`, aiErr.message);
        // Continue checking other submissions
      }
    }

    // Save the result
    submission.plagiarismCheck = {
      score: highestScore,
      flagged: highestScore >= PLAGIARISM_THRESHOLD,
      matchedWith: bestMatch,
      matchedStudentName: bestMatchName,
      summary: bestSummary || "Check completed.",
      checkedAt: new Date(),
    };
    await submission.save();

    res.json({ success: true, result: submission.plagiarismCheck });
  } catch (err) {
    console.error("Plagiarism check error:", err);
    res.status(500).json({ message: "Plagiarism check failed: " + err.message });
  }
});

// GET /api/plagiarism/task/:taskId — get plagiarism report for all submissions of a task
router.get("/task/:taskId", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const submissions = await Submission.find({
      taskId: req.params.taskId,
      "plagiarismCheck.checkedAt": { $ne: null },
    })
      .populate("userId", "name email rollNumber")
      .populate("plagiarismCheck.matchedWith", "userId")
      .select("userId plagiarismCheck performanceScore createdAt")
      .sort({ "plagiarismCheck.score": -1 });

    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Plagiarism report error:", err);
    res.status(500).json({ message: "Failed to fetch plagiarism report" });
  }
});

module.exports = router;
