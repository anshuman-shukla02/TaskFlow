const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const { createTask, getMyTasks } = require("../controllers/task.controller");

router.post("/", auth, createTask);
router.get("/my", auth, getMyTasks);
module.exports = router;