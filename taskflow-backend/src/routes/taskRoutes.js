const router = require("express").Router();
const auth = require("../middleware/auth");
const Task = require("../models/Task");

const DEFAULT_PROJECT_PHASES = [
  {
    milestone: "Phase 1: Project Overview & System Specifications",
    task: "Review system requirements, dataset schemas, and architectural guidelines.",
    content: "### Project Architecture & Guidelines\nProvide detailed guidelines, architectural instructions, and data models here.",
    type: "INFO",
    bloomLevel: "REMEMBER"
  },
  {
    milestone: "Phase 2: Pseudocode & Logic Design Proposal",
    task: "Write a high-level pseudocode proposal detailing your core algorithms and design patterns.",
    content: "Submit your pseudocode logic and architectural proposal for faculty review.",
    type: "CODE",
    bloomLevel: "UNDERSTAND"
  },
  {
    milestone: "Phase 3: Core Implementation & Use Case Code",
    task: "Implement the complete solution code for all core use cases.",
    content: "Write and execute your implementation code.",
    type: "CODE",
    bloomLevel: "APPLY"
  },
  {
    milestone: "Phase 4: Final Deliverable - GitHub Repo & Live Demo Link",
    task: "Submit your public GitHub repository URL and live deployed application URL.",
    content: "Provide your repository URL and live demo link.",
    type: "URL",
    bloomLevel: "CREATE"
  }
];

// GET /api/tasks — list all tasks
router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 }).populate("createdBy", "name email");
    res.json({ tasks });
  } catch (err) {
    console.error("Fetch tasks error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/tasks — create task (from FacultyDashboard CreateTaskModal)
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, topic, difficulty, type, bloomLevel, phases, questions, hasMarks, singleMarks, dueDate } = req.body;

    const finalPhases = type === "project" 
      ? ((Array.isArray(phases) && phases.length > 0) ? phases : DEFAULT_PROJECT_PHASES)
      : [];

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      type,
      bloomLevel,
      phases: finalPhases,
      questions: Array.isArray(questions) ? questions : [],
      hasMarks: !!hasMarks,
      singleMarks: singleMarks || 10,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create task" });
  }
});

// POST /api/tasks/create — create task (from FacultyTasks page)
router.post("/create", auth, async (req, res) => {
  try {
    const { title, description, topic, difficulty, type, bloomLevel, phases, questions, hasMarks, singleMarks, dueDate } = req.body;

    const finalPhases = type === "project" 
      ? ((Array.isArray(phases) && phases.length > 0) ? phases : DEFAULT_PROJECT_PHASES)
      : [];

    const task = await Task.create({
      title,
      description,
      topic,
      difficulty,
      type,
      bloomLevel,
      phases: finalPhases,
      questions: Array.isArray(questions) ? questions : [],
      hasMarks: !!hasMarks,
      singleMarks: singleMarks || 10,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id,
    });

    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error("Create task error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to create task" });
  }
});

// PUT /api/tasks/:id — update a task (faculty only)
router.put("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const { title, description, topic, difficulty, type, bloomLevel, questions, hasMarks, singleMarks, dueDate } = req.body;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (topic !== undefined) task.topic = topic;
    if (difficulty !== undefined) task.difficulty = difficulty;
    if (type !== undefined) task.type = type;
    if (bloomLevel !== undefined) task.bloomLevel = bloomLevel;
    if (questions !== undefined) task.questions = Array.isArray(questions) ? questions : [];
    if (hasMarks !== undefined) task.hasMarks = !!hasMarks;
    if (singleMarks !== undefined) task.singleMarks = singleMarks;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ success: false, message: "Failed to update task" });
  }
});

// GET /api/tasks/due-soon — student gets tasks due within next 7 days or overdue
router.get("/due-soon", auth, async (req, res) => {
  try {
    const Submission = require("../models/Submission");
    const mySubmissions = await Submission.find({ userId: req.user.id }).select("taskId").lean();
    const submittedTaskIds = new Set(mySubmissions.map(s => s.taskId?.toString()));

    const now = new Date();
    const future7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const tasks = await Task.find({
      dueDate: { $ne: null, $lte: future7Days },
      type: "task"
    })
      .sort({ dueDate: 1 })
      .lean();

    const pendingDue = tasks
      .filter(t => !submittedTaskIds.has(t._id.toString()))
      .map(t => {
        const diffHours = (new Date(t.dueDate) - now) / (1000 * 60 * 60);
        const isOverdue = diffHours < 0;
        return {
          ...t,
          isOverdue,
          diffHours: Math.round(diffHours),
        };
      });

    res.json({ success: true, tasks: pendingDue });
  } catch (err) {
    console.error("Due soon error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch due tasks" });
  }
});

// DELETE /api/tasks/:id — delete task + all submissions (faculty only)
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const Submission = require("../models/Submission");

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Cascade: remove all submissions for this task
    await Submission.deleteMany({ taskId: req.params.id });

    // Remove the task itself
    await Task.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Task and all submissions deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ success: false, message: "Failed to delete task" });
  }
});

// POST /api/tasks/ai-generate — generate multi-phase task or project using Gemini AI (faculty only)
router.post("/ai-generate", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized. Faculty only." });
    }

    const { sourceType, topic, materialId, bloomLevel, difficulty, type } = req.body;

    let sourceContextText = "";
    let topicName = topic || "General Computer Science";

    if (sourceType === "material" && materialId) {
      const StudyMaterial = require("../models/StudyMaterial");
      const studyMaterialRoutes = require("./studyMaterialRoutes");
      const material = await StudyMaterial.findById(materialId);
      if (!material) {
        return res.status(404).json({ message: "Selected study material not found" });
      }

      topicName = material.title || material.subject || topicName;
      try {
        const rawText = await studyMaterialRoutes.extractTextFromFile(material);
        sourceContextText = rawText.slice(0, 12000);
      } catch (err) {
        console.warn("Material text extraction warning in AI task generator:", err.message);
        sourceContextText = `Material Title: ${material.title}, Subject: ${material.subject}`;
      }
    }

    const prompt = `You are a Senior Computer Science Professor generating an assessment task or multi-phase capstone project for TaskFlow.

    Type requested: ${type === "project" ? "Multi-Phase Capstone Project" : "Single Task / Problem"}
    Target Bloom's Taxonomy Level: ${bloomLevel || "APPLY"}
    Difficulty Level: ${difficulty || "medium"}
    Topic: "${topicName}"
    ${sourceContextText ? `Reference Material Excerpt:\n"""\n${sourceContextText.slice(0, 5000)}\n"""` : ""}

    IMPORTANT REQUIREMENTS:
    If Type is "project", generate EXACTLY 4 structured Gated Milestones:
    - Phase 1: Project Overview & System Specifications (type: "INFO", bloomLevel: "REMEMBER")
    - Phase 2: Pseudocode & Logic Algorithm Proposal (type: "CODE", bloomLevel: "UNDERSTAND")
    - Phase 3: Core Implementation & Use Case Code (type: "CODE", bloomLevel: "APPLY")
    - Phase 4: Final Deliverable - Public GitHub Repo & Live Demo Link (type: "URL", bloomLevel: "CREATE")

    If Type is "task", generate 2-3 conceptual questions or coding task items.

    Respond STRICTLY with valid JSON (no markdown formatting outside JSON, no extra commentary) in this exact schema:
    {
      "title": "String title",
      "description": "Comprehensive markdown problem statement explaining objectives and guidelines",
      "topic": "${topicName}",
      "difficulty": "${difficulty || "medium"}",
      "type": "${type || "task"}",
      "bloomLevel": "${bloomLevel && bloomLevel !== "ADAPTIVE_ALL" ? bloomLevel : "APPLY"}",
      "singleMarks": 20,
      "hasMarks": true,
      "questions": [
        { "text": "Question statement 1", "marks": 10 },
        { "text": "Question statement 2", "marks": 10 }
      ],
      "phases": [
        {
          "milestone": "Phase 1: Milestone Name",
          "bloomLevel": "REMEMBER",
          "task": "Instruction for Phase 1",
          "type": "INFO",
          "content": "Detailed overview text"
        },
        {
          "milestone": "Phase 2: Pseudocode & Logic Proposal",
          "bloomLevel": "UNDERSTAND",
          "task": "Write your pseudocode algorithm logic and submit for faculty approval.",
          "type": "CODE",
          "content": "// Starter pseudocode template"
        },
        {
          "milestone": "Phase 3: Core Implementation",
          "bloomLevel": "APPLY",
          "task": "Implement the core functionality and data structures.",
          "type": "CODE",
          "content": "// Starter implementation code"
        },
        {
          "milestone": "Phase 4: Final Deliverable & Live Link",
          "bloomLevel": "CREATE",
          "task": "Submit your GitHub Repository URL and Live Deployed Demo Link.",
          "type": "URL",
          "content": ""
        }
      ]
    }`;

    const { generateContentWithFallback } = require("../utils/gemini");
    const { text: rawResponseText } = await generateContentWithFallback({ prompt, jsonMode: true });

    let parsedDraft;
    try {
      parsedDraft = JSON.parse(rawResponseText);
    } catch (parseErr) {
      console.error("JSON parse error from Gemini response:", parseErr.message, "Raw text:", rawResponseText);
      return res.status(500).json({ success: false, message: "AI response failed JSON validation. Please try again." });
    }

    res.json({ success: true, draft: parsedDraft });
  } catch (err) {
    console.error("AI task generator error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to generate AI task" });
  }
});

module.exports = router;

