const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Task = require("../models/Task");

// POST /api/submissions — student submits a task
router.post("/", auth, async (req, res) => {
  try {
    const { taskId, code, fileUrl, content, questionAnswers } = req.body;

    // Look up the task to get topic / bloom info
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Prevent duplicate submissions for the same task by this user (if not a project milestone)
    // For project milestones, they submit multiple phases so we don't block them entirely, but for standard tasks they should only submit once.
    if (task.type !== "project") {
      const existingSubmission = await Submission.findOne({ taskId, userId: req.user.id });
      if (existingSubmission) {
        return res.status(400).json({ message: "You have already submitted this task." });
      }
    }

    // For question-based tasks we leave score at 0 until faculty grades.
    // For plain tasks keep the random auto-score demo behaviour.
    const isQuestionBased = Array.isArray(task.questions) && task.questions.length > 0;
    const performanceScore = isQuestionBased ? 0 : Math.floor(Math.random() * 51) + 50;

    const submission = await Submission.create({
      taskId,
      userId: req.user.id,
      code: code || content || "",
      fileUrl: fileUrl || null,
      performanceScore,
      topic: task.topic,
      bloomLevel: task.bloomLevel,
      questionAnswers: Array.isArray(questionAnswers) ? questionAnswers : [],
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Failed to submit: " + err.message });
  }
});

// PUT /api/submissions/:id/score — faculty grades per-question scores
router.put("/:id/score", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { questionScores } = req.body; // [{ questionIndex, score }]
    const submission = await Submission.findById(req.params.id).populate("taskId");
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    const questions = submission.taskId?.questions || [];
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const earnedMarks = (questionScores || []).reduce((sum, qs) => sum + (qs.score || 0), 0);

    // Normalise to 0-10
    const performanceScore = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 10) : 0;

    submission.questionScores = questionScores || [];
    submission.performanceScore = performanceScore;
    await submission.save();

    res.json({ success: true, submission });
  } catch (err) {
    console.error("Score error:", err);
    res.status(500).json({ message: "Failed to save scores" });
  }
});

// GET /api/submissions/me — student gets their own submissions
router.get("/me", auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id })
      .select("taskId status createdAt performanceScore");
    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Fetch my submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/submissions/task/:taskId — get submissions for a specific task (faculty)
router.get("/task/:taskId", async (req, res) => {
  try {
    const submissions = await Submission.find({ taskId: req.params.taskId })
      .populate("userId", "name email rollNumber")
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (err) {
    console.error("Fetch submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/submissions/pending — faculty gets all pending project reviews
router.get("/pending", auth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      reviewStatus: "PENDING",
      milestoneId: { $ne: null },
    })
      .populate("userId", "name email rollNumber")
      .populate("taskId", "title type phases")
      .sort({ createdAt: -1 });

    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Pending reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/submissions/:id/review — faculty approves/rejects
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { status, feedback } = req.body;

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      {
        reviewStatus: status,
        reviewFeedback: feedback || "",
      },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    res.json({ success: true, submission });
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/submissions/project — student submits project milestone
router.post("/project", auth, async (req, res) => {
  try {
    const { taskId, milestoneId, bloomLevel, task, code, fileUrl, type } = req.body;

    const submission = await Submission.create({
      taskId,
      userId: req.user.id,
      milestoneId,
      bloomLevel: bloomLevel || "REMEMBER",
      topic: task || "",
      code: code || "",
      fileUrl: fileUrl || null,
      performanceScore: Math.floor(Math.random() * 51) + 50,
      reviewStatus: type === "INFO" ? "APPROVED" : "PENDING",
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Project submit error:", err);
    res.status(500).json({ message: "Failed to submit milestone" });
  }
});

module.exports = router;
