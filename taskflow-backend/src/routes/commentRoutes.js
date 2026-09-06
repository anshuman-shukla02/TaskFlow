const router = require("express").Router();
const auth = require("../middleware/auth");
const Comment = require("../models/Comment");

// POST /api/comments — create a new comment
router.post("/", auth, async (req, res) => {
  try {
    const { taskId, submissionId, message, parentId } = req.body;

    if (!taskId || !message || !message.trim()) {
      return res.status(400).json({ message: "taskId and message are required." });
    }

    const comment = await Comment.create({
      taskId,
      submissionId: submissionId || null,
      userId: req.user.id,
      message: message.trim(),
      parentId: parentId || null,
    });

    // Populate user info before returning
    const populated = await Comment.findById(comment._id)
      .populate("userId", "name email role");

    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    console.error("Create comment error:", err);
    res.status(500).json({ message: "Failed to create comment" });
  }
});

// GET /api/comments/task/:taskId — get all comments for a task
router.get("/task/:taskId", auth, async (req, res) => {
  try {
    const comments = await Comment.find({ taskId: req.params.taskId })
      .populate("userId", "name email role")
      .sort({ createdAt: 1 });

    res.json({ success: true, comments });
  } catch (err) {
    console.error("Get task comments error:", err);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// GET /api/comments/submission/:submissionId — get comments for a specific submission
router.get("/submission/:submissionId", auth, async (req, res) => {
  try {
    const comments = await Comment.find({ submissionId: req.params.submissionId })
      .populate("userId", "name email role")
      .sort({ createdAt: 1 });

    res.json({ success: true, comments });
  } catch (err) {
    console.error("Get submission comments error:", err);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
});

// DELETE /api/comments/:id — delete own comment (author only)
router.delete("/:id", auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Only the comment author or faculty/admin can delete
    if (
      comment.userId.toString() !== req.user.id &&
      req.user.role !== "faculty" &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to delete this comment" });
    }

    // Also delete all child replies
    await Comment.deleteMany({ parentId: comment._id });
    await Comment.findByIdAndDelete(comment._id);

    res.json({ success: true, message: "Comment deleted" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ message: "Failed to delete comment" });
  }
});

module.exports = router;
