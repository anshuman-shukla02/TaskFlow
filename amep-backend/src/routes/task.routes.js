const express = require("express");
const {
  createTask,
  getAllTasks,
} = require("../controllers/task.controller");

const router = express.Router();

// Faculty
router.post("/", createTask);

// Student
router.get("/", getAllTasks);

module.exports = router;