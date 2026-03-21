const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");
const authMiddleware = require("../middleware/auth");

// Create an announcement
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, content, targetAudience } = req.body;

    // Faculty can only create announcements for students
    if (req.user.role === "faculty" && targetAudience !== "student") {
      return res.status(403).json({ success: false, message: "Faculty can only create announcements for students" });
    }

    // Students cannot create announcements
    if (req.user.role === "student") {
      return res.status(403).json({ success: false, message: "Students cannot create announcements" });
    }

    const announcement = new Announcement({
      title,
      content,
      targetAudience,
      createdBy: req.user.id
    });

    await announcement.save();

    res.status(201).json({ success: true, announcement });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Fetch announcements based on role
router.get("/", authMiddleware, async (req, res) => {
  try {
    let query = {};
    const role = req.user.role;

    // Admin sees all
    if (role === "admin") {
      query = {};
    } 
    // Faculty sees announcements for "faculty" or "all"
    else if (role === "faculty") {
      query = { targetAudience: { $in: ["faculty", "all"] } };
    } 
    // Students see announcements for "student" or "all"
    else if (role === "student") {
      query = { targetAudience: { $in: ["student", "all"] } };
    }

    const announcements = await Announcement.find(query)
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    res.json({ success: true, announcements });
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete an announcement (Admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can delete announcements" });
    }

    const deleted = await Announcement.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Announcement not found" });
    }

    res.json({ success: true, message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
