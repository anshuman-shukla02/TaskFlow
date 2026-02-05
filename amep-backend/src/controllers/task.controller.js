const Task = require("../models/Task");

// Faculty creates a task
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      topic,
      difficulty,
      bloomLevel,
    } = req.body;

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      bloomLevel,
      createdBy: req.user?.id || null,
    });

    res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Student fetches all assigned tasks
exports.getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};