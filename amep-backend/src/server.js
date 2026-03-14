require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

// ────────────────────────── Middleware ──────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ────────────────────────── Routes ──────────────────────────
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/tasks", require("./routes/taskRoutes"));
app.use("/api/submissions", require("./routes/submissionRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/analytics", require("./routes/analyticsRoutes"));
app.use("/api/topics", require("./routes/topicRoutes"));

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AMEP TaskFlow Backend is running" });
});

// ────────────────────────── MongoDB ──────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/amep";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5002;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });
