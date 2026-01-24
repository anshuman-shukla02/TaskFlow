const express = require("express");
const cors = require("cors");

const submissionRoutes = require("./routes/submission.routes");
const authRoutes = require("./routes/auth.routes");
const problemRoutes = require("./routes/problem.routes");
const progressRoutes = require("./routes/progress.routes");
const topicRoutes = require("./routes/topic.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const taskRoutes = require("./routes/task.routes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/topics", topicRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/", (req, res) => {
  res.send("AMEP Backend Running");
});

module.exports = app;