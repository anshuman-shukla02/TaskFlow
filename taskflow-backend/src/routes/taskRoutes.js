const router = require("express").Router();
const auth = require("../middleware/auth");
const Task = require("../models/Task");

// GET /api/tasks — list all tasks
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }).populate("createdBy", "name email");
    res.json({ tasks });
  } catch (err) {
    console.error("Fetch tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/tasks — create task (from FacultyDashboard CreateTaskModal)
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, topic, difficulty, type, bloomLevel, phases, questions } = req.body;

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      type,
      bloomLevel,
      phases: type === "project" ? phases : [],
      questions: Array.isArray(questions) ? questions : [],
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create task" });
  }
});

// POST /api/tasks/create — create task (from FacultyTasks page)
router.post("/create", auth, async (req, res) => {
  try {
    const { title, description, topic, difficulty, type, bloomLevel, phases, questions } = req.body;

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      type,
      bloomLevel,
      phases: type === "project" ? phases : [],
      questions: Array.isArray(questions) ? questions : [],
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create task" });
  }
});

// PUT /api/tasks/:id — update a task (faculty only)
router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { title, description, topic, difficulty, type, bloomLevel, questions } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (topic !== undefined) task.topic = topic;
    if (difficulty !== undefined) task.difficulty = difficulty;
    if (type !== undefined) task.type = type;
    if (bloomLevel !== undefined) task.bloomLevel = bloomLevel;
    if (questions !== undefined) task.questions = Array.isArray(questions) ? questions : [];

    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ success: false, message: "Failed to update task" });
  }
});

// DELETE /api/tasks/:id — delete task + all submissions (faculty only)
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const Submission = require("../models/Submission");

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Cascade: remove all submissions for this task
    await Submission.deleteMany({ taskId: req.params.id });

    // Remove the task itself
    await Task.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Task and all submissions deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ success: false, message: "Failed to delete task" });
  }
});

module.exports = router;

