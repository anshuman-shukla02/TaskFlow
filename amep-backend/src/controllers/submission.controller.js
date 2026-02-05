const Submission = require("../models/Submission");
const Task = require("../models/Task");

exports.createSubmission = async (req, res) => {
  try {
    const { taskId, code, timeTaken, hintsUsed, fileUrl } = req.body;

    // 1️⃣ Get task assigned by faculty
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // 2️⃣ Create submission (Bloom inherited)
    const submission = await Submission.create({
      userId: req.user.userId,
      taskId: task._id,
      topic: task.topic,
      difficulty: task.difficulty,
      bloomLevel: task.bloomLevel, // ✅ CORE LINE
      code: code || "",
      fileUrl: fileUrl || null,
      timeTaken: timeTaken || 0,
      hintsUsed: hintsUsed || 0,
    });

    res.status(201).json({
      success: true,
      submission,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTaskSubmissions = async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log("Fetching submissions for task:", taskId);

    const submissions = await Submission.find({ taskId }).populate("userId", "name email");
    console.log("Found submissions:", submissions.length);

    res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 3️⃣ Submit Project Milestone
 */
exports.submitProjectMilestone = async (req, res) => {
  try {
    const { milestoneId, bloomLevel, task, code, fileUrl } = req.body;

    const submission = await Submission.create({
      userId: req.user.userId,
      type: "PROJECT_MILESTONE",
      milestoneId,
      taskId: null, // Project milestones might not link to a Task doc
      topic: "Project: Smart Attendance System",
      difficulty: "hard", // Projects are generally hard
      bloomLevel,
      code: code || "",
      fileUrl: fileUrl || null,
      reviewStatus: "PENDING", // Wait for Faculty
      isCorrect: false, // Will be true when Approved
      performanceScore: 0
    });

    res.status(201).json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 4️⃣ Get Pending Reviews (Faculty)
 */
exports.getPendingReviews = async (req, res) => {
  try {
    const pending = await Submission.find({
      reviewStatus: "PENDING",
      type: "PROJECT_MILESTONE"
    })
      .populate("userId", "name email rollNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: pending.length, submissions: pending });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * 5️⃣ Review Submission (Faculty Approve/Reject)
 */
exports.reviewSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body; // APPROVED or REJECTED

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const submission = await Submission.findByIdAndUpdate(
      id,
      {
        reviewStatus: status,
        reviewFeedback: feedback,
        isCorrect: status === "APPROVED",
        performanceScore: status === "APPROVED" ? 100 : 0
      },
      { new: true }
    );

    res.json({ success: true, submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};