const express = require("express");
const {
    createSubmission,
    getTaskSubmissions,
    submitProjectMilestone,
    getPendingReviews,
    reviewSubmission
} = require("../controllers/submission.controller");
const protect = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/", protect, createSubmission);
router.get("/task/:taskId", protect, getTaskSubmissions);

// PBL Routes
router.post("/project", protect, submitProjectMilestone);
router.get("/pending", protect, getPendingReviews);
router.post("/:id/review", protect, reviewSubmission);

module.exports = router;