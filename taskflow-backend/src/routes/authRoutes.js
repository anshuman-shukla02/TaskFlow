const router = require("express").Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ProfileChangeRequest = require("../models/ProfileChangeRequest");
const auth = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Prevent admin signup
    if (role === "admin") {
      return res.status(403).json({ message: "Admin accounts can only be created by the system." });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({ 
      name, 
      email, 
      password, 
      role,
      status: "pending" // New accounts start as pending
    });

    res.status(201).json({
      message: "Registration successful! Your account is pending administrator approval.",
      user: {

        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Verify role matches
    if (user.role !== role) {
      return res.status(400).json({ message: `No ${role} account found for this email` });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check account status
    if (user.status === "pending") {
      return res.status(403).json({ message: "Your account is pending administrator approval." });
    }
    if (user.status === "rejected") {
      return res.status(403).json({ message: "Your account registration has been rejected. Please contact the administrator." });
    }


    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        division: user.division,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/auth/profile-change-request
router.post("/profile-change-request", auth, async (req, res) => {
  try {
    const { name, email, rollNumber, division } = req.body;
    
    // Check if there's already a pending request
    const existing = await ProfileChangeRequest.findOne({ 
      userId: req.user.id, 
      status: "pending" 
    });
    
    if (existing) {
      return res.status(400).json({ 
        message: "You already have a pending profile change request." 
      });
    }

    const request = new ProfileChangeRequest({
      userId: req.user.id,
      requestedChanges: { name, email, rollNumber, division }
    });

    await request.save();

    res.status(201).json({ 
      success: true, 
      message: "Profile change request submitted for admin approval." 
    });
  } catch (err) {
    console.error("Profile change request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/profile-request
router.get("/profile-request", auth, async (req, res) => {
  try {
    const request = await ProfileChangeRequest.findOne({ 
      userId: req.user.id, 
      status: "pending" 
    });
    
    res.json({ 
      success: true, 
      hasPending: !!request,
      request 
    });
  } catch (err) {
    console.error("Get profile request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/auth/profile-update (Direct update for Admins)
router.put("/profile-update", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only administrators can use this endpoint." });
    }

    const { name, email, rollNumber, division } = req.body;
    
    // Only update fields that were actually provided
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (rollNumber !== undefined) updateData.rollNumber = rollNumber;
    if (division !== undefined) updateData.division = division;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    );

    res.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber,
        division: user.division,
      }
    });
  } catch (err) {
    console.error("Direct profile update error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/auth/me - Get current user's fresh profile from DB
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ success: true, user });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

