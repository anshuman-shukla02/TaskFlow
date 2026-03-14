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
    const { title, description, topic, difficulty, type, bloomLevel } = req.body;

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      type,
      bloomLevel,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: "Failed to create task" });
  }
});

// POST /api/tasks/create — create task (from FacultyTasks page)
router.post("/create", auth, async (req, res) => {
  try {
    const { title, description, topic, difficulty, type, bloomLevel } = req.body;

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      type,
      bloomLevel,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: "Failed to create task" });
  }
});

module.exports = router;
