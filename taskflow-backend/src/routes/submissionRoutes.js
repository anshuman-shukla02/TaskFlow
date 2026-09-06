const router = require("express").Router();
const auth = require("../middleware/auth");
const Submission = require("../models/Submission");
const Task = require("../models/Task");
const User = require("../models/User");
const { evaluateBadges } = require("./gamificationRoutes");

// POST /api/submissions — student submits a task
router.post("/", auth, async (req, res) => {
  try {
    const { taskId, code, fileUrl, content, questionAnswers } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (task.type !== "project") {
      const existingSubmission = await Submission.findOne({ taskId, userId: req.user.id });
      if (existingSubmission) {
        return res.status(400).json({ message: "You have already submitted this task." });
      }
    }

    const isQuestionBased = Array.isArray(task.questions) && task.questions.length > 0;
    // If task has marks enabled, start at 0 (pending grading); otherwise random auto-score (no progress impact)
    const performanceScore = (isQuestionBased || task.hasMarks) ? 0 : Math.floor(Math.random() * 51) + 50;

    const submission = await Submission.create({
      taskId,
      userId: req.user.id,
      code: code || content || "",
      fileUrl: fileUrl || null,
      performanceScore,
      topic: task.topic,
      bloomLevel: task.bloomLevel,
      questionAnswers: Array.isArray(questionAnswers) ? questionAnswers : [],
      countForProgress: !!task.hasMarks,
    });

    // Trigger AI evaluation asynchronously in background
    runAutoAiEvaluation(submission._id).catch(err => console.error("Async AI evaluation trigger warning:", err.message));

    // Trigger badge evaluation asynchronously
    evaluateBadges(req.user.id).catch(err => console.error("Badge evaluation warning:", err.message));

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Failed to submit: " + err.message });
  }
});

// GET /api/submissions/all — faculty views all submissions filtered by division & type
// ?division=A|B|C|All  &type=task|project
router.get("/all", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { division, type } = req.query;

    // Build student filter
    const studentFilter = { role: "student" };
    if (division && division !== "All") studentFilter.division = division;

    const students = await User.find(studentFilter).select("_id name email rollNumber division");
    const studentIds = students.map((s) => s._id);
    const studentMap = {};
    students.forEach((s) => { studentMap[s._id.toString()] = s; });

    // Build submission filter
    const subFilter = { userId: { $in: studentIds } };
    if (type === "project") {
      subFilter.milestoneId = { $ne: null };
    } else if (type === "task") {
      subFilter.$or = [{ milestoneId: null }, { milestoneId: { $exists: false } }];
    }

    const submissions = await Submission.find(subFilter)
      .populate("userId", "name email rollNumber division")
      .populate("taskId", "title type topic bloomLevel difficulty questions phases hasMarks singleMarks")
      .sort({ createdAt: -1 })
      .lean();

    // Resolve S3 URLs to presigned URLs
    const { getPresignedUrl } = require("../utils/s3Storage");
    const resolved = await Promise.all(
      submissions.map(async (s) => {
        const obj = { ...s };
        if (obj.fileUrl && (obj.fileUrl.startsWith("s3://") || obj.fileUrl.includes("amazonaws.com"))) {
          try { obj.fileUrl = await getPresignedUrl(obj.fileUrl); } catch(e) {}
        }
        if (obj.questionAnswers) {
          for (const qa of obj.questionAnswers) {
            if (qa.fileUrl && (qa.fileUrl.startsWith("s3://") || qa.fileUrl.includes("amazonaws.com"))) {
              try { qa.fileUrl = await getPresignedUrl(qa.fileUrl); } catch(e) {}
            }
          }
        }
        return obj;
      })
    );

    res.json({ success: true, submissions: resolved });
  } catch (err) {
    console.error("All submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/submissions/:id/score — faculty grades per-question scores (question-based tasks)
router.put("/:id/score", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { questionScores } = req.body;
    const submission = await Submission.findById(req.params.id).populate("taskId");
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    const questions = submission.taskId?.questions || [];
    const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    const earnedMarks = (questionScores || []).reduce((sum, qs) => sum + (qs.score || 0), 0);

    const performanceScore = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 10) : 0;

    submission.questionScores = questionScores || [];
    submission.performanceScore = performanceScore;
    await submission.save();

    res.json({ success: true, submission });
  } catch (err) {
    console.error("Score error:", err);
    res.status(500).json({ message: "Failed to save scores" });
  }
});

// PUT /api/submissions/:id/mark — faculty directly sets performanceScore (0-10) for plain tasks
router.put("/:id/mark", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { score } = req.body;
    const parsedScore = Math.min(10, Math.max(0, Number(score) || 0));

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: "Submission not found" });

    submission.performanceScore = parsedScore;
    await submission.save();

    res.json({ success: true, submission });
  } catch (err) {
    console.error("Mark error:", err);
    res.status(500).json({ message: "Failed to save mark" });
  }
});

// GET /api/submissions/me — student gets their own submissions
router.get("/me", auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id })
      .select("taskId status createdAt performanceScore");
    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Fetch my submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/submissions/task/:taskId — get submissions for a specific task (faculty)
router.get("/task/:taskId", auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ taskId: req.params.taskId })
      .populate("userId", "name email rollNumber")
      .sort({ createdAt: -1 });

    res.json({ submissions });
  } catch (err) {
    console.error("Fetch submissions error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/submissions/pending — faculty gets all pending project reviews
router.get("/pending", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const submissions = await Submission.find({
      reviewStatus: "PENDING",
      milestoneId: { $ne: null },
    })
      .populate("userId", "name email rollNumber")
      .populate("taskId", "title type phases")
      .sort({ createdAt: -1 });

    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Pending reviews error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/submissions/:id/review — faculty approves/rejects project milestone
router.post("/:id/review", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { status, feedback, performanceScore } = req.body;

    const updateFields = { reviewStatus: status, reviewFeedback: feedback || "" };
    if (performanceScore !== undefined && performanceScore !== null) {
      updateFields.performanceScore = Math.min(100, Math.max(0, Number(performanceScore) || 0));
    }

    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Trigger badge evaluation asynchronously if approved
    if (status === "APPROVED") {
      evaluateBadges(submission.userId).catch(err =>
        console.error("Badge evaluation error on milestone approval:", err.message)
      );
    }

    res.json({ success: true, submission });
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/submissions/:id/ai-prescreen — AI Co-Pilot pre-analyzes student project submission for Faculty
router.post("/:id/ai-prescreen", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const submission = await Submission.findById(req.params.id)
      .populate("userId", "name email")
      .populate("taskId", "title description topic phases");

    if (!submission) return res.status(404).json({ message: "Submission not found" });

    const phase = submission.taskId?.phases?.[submission.milestoneId];
    const phaseName = phase?.milestone || `Phase ${submission.milestoneId + 1}`;

    const prompt = `You are an AI Teaching Assistant pre-screening a student's submission for a Faculty Reviewer.

    Project Title: "${submission.taskId?.title}"
    Milestone / Phase: "${phaseName}"
    Phase Type: "${phase?.type || "CODE"}"
    Student Code / Submission Text:
    """
    ${submission.code || submission.fileUrl || "No text provided"}
    """

    Evaluate the student's submission for completeness, logical soundess, and correctness relative to the phase requirements.
    Respond STRICTLY with valid JSON (no markdown fences outside JSON) in this exact schema:
    {
      "completenessScore": 85,
      "summary": "Concise summary of student submission quality",
      "suggestedStatus": "APPROVED",
      "suggestedFeedback": "Constructive feedback string for faculty to send to student"
    }`;

    const { generateContentWithFallback } = require("../utils/gemini");
    const { text: rawText } = await generateContentWithFallback({ prompt, jsonMode: true });
    const aiAnalysis = JSON.parse(rawText);
    res.json({ success: true, aiAnalysis });
  } catch (err) {
    console.error("AI prescreen error:", err);
    res.status(500).json({ success: false, message: "AI prescreen failed: " + err.message });
  }
});

// GET /api/submissions/project/status/:taskId — student fetches phase-by-phase progression status
router.get("/project/status/:taskId", auth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      taskId: req.params.taskId,
      userId: req.user.id,
      milestoneId: { $ne: null }
    }).sort({ milestoneId: 1 });

    res.json({ success: true, submissions });
  } catch (err) {
    console.error("Fetch project status error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/submissions/project — student submits project milestone (with Gated Access Validation)
router.post("/project", auth, async (req, res) => {
  try {
    const { taskId, milestoneId, bloomLevel, task, code, fileUrl, type } = req.body;

    // Gated Validation: If milestoneId > 0, check if previous milestone (milestoneId - 1) is APPROVED
    if (milestoneId > 0) {
      const prevSubmission = await Submission.findOne({
        taskId,
        userId: req.user.id,
        milestoneId: milestoneId - 1,
      });

      if (!prevSubmission || (prevSubmission.reviewStatus !== "APPROVED" && prevSubmission.reviewStatus !== "accepted")) {
        return res.status(403).json({
          message: `Phase ${milestoneId + 1} is locked! You must complete Phase ${milestoneId} and receive Faculty approval before proceeding.`
        });
      }
    }

    // Check if an existing submission for this milestone exists
    let submission = await Submission.findOne({
      taskId,
      userId: req.user.id,
      milestoneId,
    });

    const isInfoType = type === "INFO" || Number(milestoneId) === 0;
    const initialStatus = isInfoType ? "APPROVED" : "PENDING";

    if (submission) {
      submission.code = code || submission.code || "";
      submission.fileUrl = fileUrl || submission.fileUrl || null;
      submission.reviewStatus = isInfoType ? "APPROVED" : submission.reviewStatus;
      if (isInfoType) submission.reviewFeedback = "";
      await submission.save();
    } else {
      submission = await Submission.create({
        taskId,
        userId: req.user.id,
        milestoneId,
        bloomLevel: bloomLevel || "REMEMBER",
        topic: task || "",
        code: code || "",
        fileUrl: fileUrl || null,
        performanceScore: isInfoType ? 100 : Math.floor(Math.random() * 51) + 50,
        reviewStatus: initialStatus,
      });
    }

    // Trigger AI evaluation asynchronously in background if not an INFO phase
    if (!isInfoType) {
      runAutoAiEvaluation(submission._id).catch(err => console.error("Async AI project evaluation trigger warning:", err.message));
    }

    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error("Project submit error:", err);
    res.status(500).json({ message: "Failed to submit milestone: " + err.message });
  }
});

// POST /api/submissions/:id/ai-evaluate — faculty manually triggers AI evaluation for a submission
router.post("/:id/ai-evaluate", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await runAutoAiEvaluation(req.params.id);
    if (!updated) {
      return res.status(500).json({ success: false, message: "AI evaluation failed or missing key." });
    }

    res.json({ success: true, submission: updated, aiEvaluation: updated.aiEvaluation });
  } catch (err) {
    console.error("Manual AI evaluate route error:", err);
    res.status(500).json({ success: false, message: "Failed to run AI evaluation: " + err.message });
  }
});

/* ── Automatic Gemini AI Submission Evaluator Helper ── */
async function runAutoAiEvaluation(submissionId) {
  try {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock_key_for_now") {
      return null;
    }

    const submission = await Submission.findById(submissionId)
      .populate("userId", "name email rollNumber")
      .populate("taskId", "title description topic bloomLevel questions phases hasMarks singleMarks type");

    if (!submission || !submission.taskId) return null;

    const task = submission.taskId;
    const isProject = submission.milestoneId !== null && submission.milestoneId !== undefined;
    
    // Skip if milestone is type INFO and already approved
    if (isProject && submission.reviewStatus === "APPROVED") {
      const phase = task.phases?.[submission.milestoneId];
      if (phase?.type === "INFO") return null;
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    let prompt = "";
    if (isProject) {
      const phase = task.phases?.[submission.milestoneId] || {};
      const phaseTitle = phase.milestone || `Phase ${submission.milestoneId + 1}`;
      const phaseType = phase.type || "CODE";
      const phaseTask = phase.task || "";
      const phaseContent = phase.content || "";

      prompt = `You are a Senior Computer Science Professor pre-grading a student capstone project phase.

Project Title: "${task.title}"
Phase / Milestone: "${phaseTitle}"
Phase Type: "${phaseType}"
Phase Task / Requirements: "${phaseTask}"
Detailed Guidelines: "${phaseContent.slice(0, 1000)}"

Student Submission Code / Details:
"""
${submission.code || submission.fileUrl || "No code provided"}
"""

Evaluate the student submission for technical completeness, logical accuracy, and adherence to requirements.
Respond STRICTLY with valid JSON in this exact schema:
{
  "suggestedScore": 8,
  "suggestedStatus": "APPROVED",
  "suggestedFeedback": "1. Solid logic implementation.\n2. Add edge-case error handling."
}`;
    } else if (Array.isArray(task.questions) && task.questions.length > 0) {
      const qAnswers = submission.questionAnswers || [];
      const questionsText = task.questions.map((q, idx) => {
        const studentAns = qAnswers.find(a => a.questionIndex === idx)?.answer || "No answer provided";
        return `Question ${idx + 1} (${q.marks || 5} marks): "${q.text}"\nStudent Answer: "${studentAns}"`;
      }).join("\n\n");

      prompt = `You are a Senior Computer Science Professor grading a multi-question student assignment.

Task Title: "${task.title}"
Bloom's Taxonomy Level: "${task.bloomLevel || "APPLY"}"

Questions & Answers:
${questionsText}

Evaluate each question answer accurately.
Respond STRICTLY with valid JSON in this exact schema:
{
  "suggestedScore": 18,
  "questionScores": [
    { "questionIndex": 0, "score": 9, "feedback": "Accurate explanation." },
    { "questionIndex": 1, "score": 9, "feedback": "Good logic." }
  ],
  "suggestedFeedback": "Overall strong work. Reviewed answers carefully."
}`;
    } else {
      const maxMarks = task.singleMarks || 10;
      prompt = `You are a Senior Computer Science Professor grading a student task submission.

Task Title: "${task.title}"
Description / Prompt: "${(task.description || "").slice(0, 1000)}"
Target Bloom's Level: "${task.bloomLevel || "APPLY"}"
Max Marks: ${maxMarks}

Student Submission Code / Text:
"""
${submission.code || submission.fileUrl || "No submission text"}
"""

Evaluate the submission and suggest a score out of 10.
Respond STRICTLY with valid JSON in this exact schema:
{
  "suggestedScore": 9,
  "suggestedFeedback": "Well structured solution adhering to constraints."
}`;
    }

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();
    if (rawText.startsWith("```json")) rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    else if (rawText.startsWith("```")) rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");

    const parsed = JSON.parse(rawText);

    submission.aiEvaluation = {
      suggestedScore: typeof parsed.suggestedScore === "number" ? parsed.suggestedScore : 8,
      suggestedStatus: parsed.suggestedStatus || (parsed.suggestedScore >= 6 ? "APPROVED" : "REJECTED"),
      suggestedFeedback: parsed.suggestedFeedback || "AI evaluated submission quality.",
      questionScores: Array.isArray(parsed.questionScores) ? parsed.questionScores : [],
      evaluatedAt: new Date(),
      isFacultyAccepted: false,
    };

    await submission.save();
    console.log(`✨ AI Auto-Evaluation completed for submission ${submission._id}`);
    return submission;
  } catch (err) {
    console.error("Auto AI Evaluation error:", err.message);
    return null;
  }
}

module.exports = router;
