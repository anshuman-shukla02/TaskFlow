const Task = require("../models/Task");

/**
 * CREATE TASK
 * POST /api/tasks
 */
exports.createTask = async (req, res) => {
  try {
    const { title, description, difficulty } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    // normalize difficulty for enum safety
    const normalizedDifficulty = difficulty
      ? difficulty.toLowerCase()
      : "easy";

    const task = await Task.create({
      title,
      description,
      difficulty: normalizedDifficulty,
      createdBy: req.user.userId,
    });

    res.status(201).json(task);
  } catch (error) {
    console.error("Create Task Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET TASKS CREATED BY LOGGED-IN FACULTY
 * GET /api/tasks/my
 */
exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      createdBy: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json({
      total: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("Fetch Tasks Error:", error);
    res.status(500).json({ message: error.message });
  }
};