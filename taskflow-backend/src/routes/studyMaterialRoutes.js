const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const StudyMaterial = require("../models/StudyMaterial");
const MaterialChat = require("../models/MaterialChat");

// ────────────────────────── Upload Config ──────────────────────────
const uploadDir = path.join(__dirname, "../uploads/materials");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "material-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const allowedMimeTypes = [
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, PPT, PPTX, DOC, DOCX, and TXT files are allowed."), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper: map extension to fileType enum
function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  const map = { pdf: "pdf", ppt: "ppt", pptx: "pptx", txt: "txt", doc: "doc", docx: "docx" };
  return map[ext] || "txt";
}

// ────────────────────────── UPLOAD (Faculty only) ──────────────────────────
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can upload materials" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { title, description, subject } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }

    const fileUrl = `http://localhost:5002/uploads/materials/${req.file.filename}`;

    const material = await StudyMaterial.create({
      title: title.trim(),
      description: description || "",
      subject: subject || "",
      fileUrl,
      originalName: req.file.originalname,
      fileType: getFileType(req.file.originalname),
      fileSize: req.file.size,
      uploadedBy: req.user.id,
    });

    const populated = await StudyMaterial.findById(material._id).populate("uploadedBy", "name email");

    res.json({ success: true, material: populated });
  } catch (err) {
    console.error("Material upload error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  }
});

// ────────────────────────── LIST ALL ──────────────────────────
router.get("/", auth, async (req, res) => {
  try {
    const materials = await StudyMaterial.find()
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ materials });
  } catch (err) {
    console.error("List materials error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ────────────────────────── DELETE (Faculty owner only) ──────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    if (req.user.role !== "faculty") {
      return res.status(403).json({ message: "Only faculty can delete materials" });
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    if (material.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can only delete your own materials" });
    }

    // Delete file from disk
    const filename = material.fileUrl.split("/").pop();
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await MaterialChat.deleteMany({ material: req.params.id });
    await StudyMaterial.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Material deleted" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ────────────────────────── GET EXISTING CHATS ──────────────────────────
router.get("/:id/chats", auth, async (req, res) => {
  try {
    const chats = await MaterialChat.find({
      student: req.user.id,
      material: req.params.id,
    }).sort({ createdAt: 1 });
    res.json({ success: true, chats });
  } catch (err) {
    console.error("Fetch chats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ────────────────────────── AI QUERY (Preset questions only) ──────────────────────────
const PRESET_PROMPTS = {
  summary:
    "Provide a clear and concise summary of the following study material. Use bullet points for clarity. Make it comprehensive but easy to read.",
  keypoints:
    "Extract and list all the key points from the following study material. Number each point. Focus on the most important concepts, facts, and ideas.",
  "5_questions":
    "Generate exactly 5 important exam-style questions with detailed answers based on the following study material. Format each as:\n\nQ1: [question]\nA1: [answer]\n\nCover the most critical topics.",
  "10_questions":
    "Generate exactly 10 important exam-style questions with detailed answers based on the following study material. Format each as:\n\nQ1: [question]\nA1: [answer]\n\nCover a broad range of topics from the material.",
  "20_questions":
    "Generate exactly 20 important exam-style questions with detailed answers based on the following study material. Format each as:\n\nQ1: [question]\nA1: [answer]\n\nCover all major and minor topics comprehensively.",
  explain_simple:
    "Explain the content of the following study material in very simple, easy-to-understand language. Use analogies and examples where possible. Assume the reader is a beginner.",
  formulas_theorems:
    "List ALL formulas, theorems, key definitions, and important rules found in the following study material. Format them clearly with proper labels. If no formulas exist, list the key definitions and principles instead.",
};

// Extract text from file on disk
async function extractTextFromFile(material) {
  const filename = material.fileUrl.split("/").pop();
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error("File not found on server");
  }

  if (material.fileType === "txt") {
    return fs.readFileSync(filePath, "utf-8");
  }

  if (material.fileType === "pdf") {
    const pdfParse = require("pdf-parse");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  // For PPT, PPTX, DOC, DOCX — read raw buffer and convert to base64
  // Gemini can handle document understanding, but we'll extract what we can
  const buffer = fs.readFileSync(filePath);
  return buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
}

router.post("/:id/ai-query", auth, async (req, res) => {
  try {
    const { queryType } = req.body;

    if (!queryType || !PRESET_PROMPTS[queryType]) {
      return res.status(400).json({
        message: "Invalid query type. Allowed: " + Object.keys(PRESET_PROMPTS).join(", "),
      });
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    // Check if query is already cached for this student
    const existingChat = await MaterialChat.findOne({
      student: req.user.id,
      material: req.params.id,
      queryType,
    });

    if (existingChat) {
      return res.json({
        success: true,
        queryType,
        materialTitle: material.title,
        response: existingChat.response,
        cached: true,
      });
    }

    // Extract text
    let fileText;
    try {
      fileText = await extractTextFromFile(material);
    } catch (extractErr) {
      console.error("Text extraction error:", extractErr);
      return res.status(400).json({ message: "Could not extract text: " + extractErr.message });
    }

    if (!fileText || fileText.trim().length < 20) {
      return res.status(400).json({ message: "Could not extract enough text from this file to generate a meaningful response." });
    }

    // Truncate to ~30k chars to stay within token limits
    const truncatedText = fileText.substring(0, 30000);

    const systemPrompt = PRESET_PROMPTS[queryType];
    const fullPrompt = `${systemPrompt}\n\n--- STUDY MATERIAL START ---\nTitle: ${material.title}\nSubject: ${material.subject || "Not specified"}\n\n${truncatedText}\n--- STUDY MATERIAL END ---`;

    // Call Gemini
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "mock_key_for_now") {
      return res.status(503).json({ message: "AI service is not configured. Please set a valid GEMINI_API_KEY." });
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent(fullPrompt);
    const responseText = result.response.text();

    await MaterialChat.create({
      student: req.user.id,
      material: req.params.id,
      queryType,
      response: responseText,
    });

    res.json({
      success: true,
      queryType,
      materialTitle: material.title,
      response: responseText,
    });
  } catch (err) {
    console.error("AI query error:", err);
    res.status(500).json({ message: "AI query failed: " + (err.message || "Server error") });
  }
});

module.exports = router;
