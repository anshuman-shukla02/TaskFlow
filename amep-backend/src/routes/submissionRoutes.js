const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Task = require("../models/Task");

// POST /api/submissions — student submits a task
router.post("/", auth, async (req, res) => {
  try {
    const { taskId, code, fileUrl, content } = req.body;

    // Look up the task to get topic / bloom info
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Simple auto-score: random 50-100 for demo (replace with real evaluation later)
    const performanceScore = Math.floor(Math.random() * 51) + 50;

    const submission = await Submission.create({
      taskId,
      userId: req.user.id,
      code: code || content || "",
      fileUrl: fileUrl || null,
      performanceScore,
      topic: task.topic,
      bloomLevel: task.bloomLevel,
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Failed to submit" });
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
    const { milestoneId, bloomLevel, task, code, fileUrl } = req.body;

    const submission = await Submission.create({
      userId: req.user.id,
      milestoneId,
      bloomLevel: bloomLevel || "REMEMBER",
      topic: task || "",
      code: code || "",
      fileUrl: fileUrl || null,
      performanceScore: Math.floor(Math.random() * 51) + 50,
      reviewStatus: "PENDING",
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Project submit error:", err);
    res.status(500).json({ message: "Failed to submit milestone" });
  }
});

module.exports = router;
