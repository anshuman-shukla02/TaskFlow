const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Task = require("../models/Task");
const User = require("../models/User");

// POST /api/submissions — student submits a task
router.post("/", auth, async (req, res) => {
  try {
    const { taskId, code, fileUrl, content, questionAnswers } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.type !== "project") {
      const existingSubmission = await Submission.findOne({ taskId, userId: req.user.id });
      if (existingSubmission) {
        return res.status(400).json({ message: "You have already submitted this task." });
      }
    }

    const isQuestionBased = Array.isArray(task.questions) && task.questions.length > 0;
    // If task has marks enabled, start at 0 (pending grading); otherwise random auto-score (no progress impact)
    const performanceScore = (isQuestionBased || task.hasMarks) ? 0 : Math.floor(Math.random() * 51) + 50;

    const submission = await Submission.create({
      taskId,
      userId: req.user.id,
      code: code || content || "",
      fileUrl: fileUrl || null,
      performanceScore,
      topic: task.topic,
      bloomLevel: task.bloomLevel,
      questionAnswers: Array.isArray(questionAnswers) ? questionAnswers : [],
      countForProgress: !!task.hasMarks,
    });

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Failed to submit: " + err.message });
  }
});

// GET /api/submissions/all — faculty views all submissions filtered by division & type
// ?division=A|B|C|All  &type=task|project
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { division, type } = req.query;

    // Build student filter
    const studentFilter = { role: "student" };
    if (division && division !== "All") studentFilter.division = division;

    const students = await User.find(studentFilter).select("_id name email rollNumber division");
    const studentIds = students.map((s) => s._id);
    const studentMap = {};
    students.forEach((s) => { studentMap[s._id.toString()] = s; });

    // Build submission filter
    const subFilter = { userId: { $in: studentIds } };
    if (type === "project") {
      subFilter.milestoneId = { $ne: null };
    } else if (type === "task") {
      subFilter.$or = [{ milestoneId: null }, { milestoneId: { $exists: false } }];
    }

    const submissions = await Submission.find(subFilter)
      .populate("userId", "name email rollNumber division")
      .populate("taskId", "title type topic bloomLevel difficulty questions phases hasMarks singleMarks")
      .sort({ createdAt: -1 })
      .lean();

    // Resolve S3 URLs to presigned URLs
    const { getPresignedUrl } = require("../utils/s3Storage");
    const resolved = await Promise.all(
      submissions.map(async (s) => {
        const obj = { ...s };
        if (obj.fileUrl && (obj.fileUrl.startsWith("s3://") || obj.fileUrl.includes("amazonaws.com"))) {
          try { obj.fileUrl = await getPresignedUrl(obj.fileUrl); } catch(e) {}
        }
        if (obj.questionAnswers) {
          for (const qa of obj.questionAnswers) {
            if (qa.fileUrl && (qa.fileUrl.startsWith("s3://") || qa.fileUrl.includes("amazonaws.com"))) {
              try { qa.fileUrl = await getPresignedUrl(qa.fileUrl); } catch(e) {}
            }
          }
        }
        return obj;
      })
    );

    res.json({ success: true, submissions: resolved });
  } catch (err) {
    console.error("All submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/submissions/:id/score — faculty grades per-question scores (question-based tasks)
router.put("/:id/score", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { questionScores } = req.body;
    const submission = await Submission.findById(req.params.id).populate("taskId");
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    const questions = submission.taskId?.questions || [];
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const earnedMarks = (questionScores || []).reduce((sum, qs) => sum + (qs.score || 0), 0);

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

// PUT /api/submissions/:id/mark — faculty directly sets performanceScore (0-10) for plain tasks
router.put("/:id/mark", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { score } = req.body;
    const parsedScore = Math.min(10, Math.max(0, Number(score) || 0));

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    submission.performanceScore = parsedScore;
    await submission.save();

    res.json({ success: true, submission });
  } catch (err) {
    console.error("Mark error:", err);
    res.status(500).json({ message: "Failed to save mark" });
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
router.get("/task/:taskId", auth, async (req, res) => {
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

// POST /api/submissions/:id/review — faculty approves/rejects project milestone
router.post("/:id/review", auth, async (req, res) => {
  try {
    const { status, feedback } = req.body;

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { reviewStatus: status, reviewFeedback: feedback || "" },
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
