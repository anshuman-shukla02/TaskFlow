const router = require("express").Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Announcement = require("../models/Announcement");
const ProfileChangeRequest = require("../models/ProfileChangeRequest");
const Submission = require("../models/Submission");

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admin only." });
  }
  next();
};

// GET /api/admin/dashboard-stats
router.get("/dashboard-stats", auth, isAdmin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student", status: { $ne: "rejected" } });
    const totalFaculty = await User.countDocuments({ role: "faculty", status: { $ne: "rejected" } });
    const totalAnnouncements = await Announcement.countDocuments();
    const pendingRequests = await ProfileChangeRequest.countDocuments({ status: "pending" });
    const pendingUsers = await User.countDocuments({ status: "pending" });


    // Students by division (only approved/pending — not rejected)
    const divisionStats = await User.aggregate([
      { $match: { role: "student", status: { $ne: "rejected" } } },
      { $group: { _id: "$division", count: { $sum: 1 } } }
    ]);

    // Recent registrations (mocking for growth trend)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({ 
        role: "student",
        createdAt: { $gte: thirtyDaysAgo } 
    });

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalFaculty,
        totalAnnouncements,
        pendingRequests,
        pendingUsers,
        recentRegistrations

      },
      divisionStats
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/admin/student-growth
router.get("/student-growth", auth, isAdmin, async (req, res) => {
  try {
    const growth = await User.aggregate([
      { $match: { role: "student" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json({ success: true, growth });
  } catch (err) {
    console.error("Student growth error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/admin/profile-requests
router.get("/profile-requests", auth, isAdmin, async (req, res) => {
  try {
    const requests = await ProfileChangeRequest.find({ status: "pending" })
      .populate("userId", "name email rollNumber division role")
      .sort({ createdAt: -1 });

    res.json({ success: true, requests });
  } catch (err) {
    console.error("Profile requests error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/admin/profile-requests/:id/approve
router.put("/profile-requests/:id/approve", auth, isAdmin, async (req, res) => {
  try {
    const request = await ProfileChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
    }

    // Update user
    const updateData = {};
    if (request.requestedChanges.name) updateData.name = request.requestedChanges.name;
    if (request.requestedChanges.email) updateData.email = request.requestedChanges.email;
    if (request.requestedChanges.rollNumber) updateData.rollNumber = request.requestedChanges.rollNumber;
    if (request.requestedChanges.division) updateData.division = request.requestedChanges.division;

    await User.findByIdAndUpdate(request.userId, updateData);

    // Update request status
    request.status = "approved";
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    await request.save();

    res.json({ success: true, message: "Profile update approved and applied" });
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/admin/profile-requests/:id/reject
router.put("/profile-requests/:id/reject", auth, isAdmin, async (req, res) => {
  try {
    const request = await ProfileChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    request.status = "rejected";
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.rejectionReason = req.body.reason || "No reason provided";
    await request.save();

    res.json({ success: true, message: "Profile update rejected" });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET /api/admin/pending-users
router.get("/pending-users", auth, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ status: "pending" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    console.error("Pending users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/admin/users/:id/approve
router.put("/users/:id/approve", auth, isAdmin, async (req, res) => {
  try {
    console.log(`Approving user ID: ${req.params.id} by admin: ${req.user.id}`);
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log(`User not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = "approved";
    await user.save();

    console.log(`User ${user.email} approved successfully`);
    res.json({ success: true, message: `Account for ${user.name} has been approved.` });
  } catch (err) {
    console.error("Approve user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// PUT /api/admin/users/:id/reject
router.put("/users/:id/reject", auth, isAdmin, async (req, res) => {
  try {
    console.log(`Rejecting user ID: ${req.params.id} by admin: ${req.user.id}`);
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log(`User not found: ${req.params.id}`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = "rejected";
    await user.save();

    console.log(`User ${user.email} rejected successfully`);
    res.json({ success: true, message: `Account for ${user.name} has been rejected.` });
  } catch (err) {
    console.error("Reject user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
