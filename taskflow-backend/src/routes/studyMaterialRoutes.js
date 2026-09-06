const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const StudyMaterial = require("../models/StudyMaterial");
const MaterialChat = require("../models/MaterialChat");
const StudyMaterialChatSession = require("../models/StudyMaterialChatSession");
const { uploadToS3 } = require("../utils/s3Storage");
const { GetObjectCommand, S3Client } = require("@aws-sdk/client-s3");

// ────────────────────────── Storage Selection ──────────────────────────
const useS3 = process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME;

// Configure multer
const storage = useS3
  ? multer.memoryStorage() // S3 needs buffer
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads/materials");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
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

    let fileUrl;
    if (useS3) {
      fileUrl = await uploadToS3(req.file, "materials");
    } else {
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5002}`;
      fileUrl = `${baseUrl}/uploads/materials/${req.file.filename}`;
    }

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

    // Resolve S3 URLs to presigned URLs for the client
    const { getPresignedUrl } = require("../utils/s3Storage");
    const resolved = await Promise.all(
      materials.map(async (m) => {
        const obj = m.toObject();
        if (obj.fileUrl && (obj.fileUrl.startsWith("s3://") || obj.fileUrl.includes("amazonaws.com"))) {
          try {
            obj.fileUrl = await getPresignedUrl(obj.fileUrl);
          } catch (e) {
            console.error("Presign error for", obj.fileUrl, e.message);
          }
        }
        return obj;
      })
    );

    res.json({ materials: resolved });
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

    // Delete file from disk (only for local files, skip for S3)
    if (!material.fileUrl.includes("amazonaws.com")) {
      const filename = material.fileUrl.split("/").pop();
      const filePath = path.join(__dirname, "../uploads/materials", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
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

// ────────────────────────── AI Extraction ──────────────────────────

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

// Extract text from file (Disk, S3, or Remote HTTP)
async function extractTextFromFile(material) {
  let dataBuffer;
  const fileUrl = material.fileUrl || "";

  // 1. Check if S3 URL (starts with s3:// or contains amazonaws.com)
  if (fileUrl.startsWith("s3://") || fileUrl.includes("amazonaws.com")) {
    let bucket = process.env.S3_BUCKET_NAME || "taskflow-assets-zephyr";
    let key;

    if (fileUrl.startsWith("s3://")) {
      const parts = fileUrl.substring(5).split("/");
      bucket = parts[0] || bucket;
      key = parts.slice(1).join("/");
    } else {
      const urlParts = new URL(fileUrl);
      bucket = urlParts.hostname.split(".")[0];
      key = urlParts.pathname.substring(1);
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION || "ap-south-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(command);
    dataBuffer = await streamToBuffer(response.Body);
  } else {
    // 2. Check local disk upload directory
    const filename = fileUrl.split("/").pop().split("?")[0];
    const filePath = path.join(__dirname, "../uploads/materials", filename);

    if (fs.existsSync(filePath)) {
      dataBuffer = fs.readFileSync(filePath);
    } else if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      // 3. Fallback: Download via axios if it's a remote HTTP file
      const axios = require("axios");
      const httpRes = await axios.get(fileUrl, { responseType: "arraybuffer" });
      dataBuffer = Buffer.from(httpRes.data);
    } else {
      throw new Error(`File not found on server or storage: ${filename}`);
    }
  }

  const ext = (material.fileType || path.extname(material.originalName || "").replace(".", "")).toLowerCase();

  if (ext === "txt") {
    return dataBuffer.toString("utf-8");
  }

  if (ext === "pdf") {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  if (["ppt", "pptx", "doc", "docx", "xls", "xlsx", "ods", "odt"].includes(ext)) {
    try {
      const { parseOffice } = require("officeparser");
      const text = await parseOffice(dataBuffer, { fileType: ext });
      if (text && text.trim().length > 0) {
        return text;
      }
    } catch (officeErr) {
      console.warn("OfficeParser extraction warning:", officeErr.message);
    }
  }

  // Fallback string extraction for all other formats
  return dataBuffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

// ────────────────────────── CONVERSATIONAL CHAT ENDPOINTS ──────────────────────────

// GET /api/materials/:id/conversation — retrieve chat history
router.get("/:id/conversation", auth, async (req, res) => {
  try {
    let session = await StudyMaterialChatSession.findOne({
      student: req.user.id,
      material: req.params.id,
    });

    if (!session) {
      session = await StudyMaterialChatSession.create({
        student: req.user.id,
        material: req.params.id,
        messages: [],
      });
    }

    res.json({ success: true, messages: session.messages });
  } catch (err) {
    console.error("Get conversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/materials/:id/chat — send message and get context-aware reply
router.post("/:id/chat", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: "Material not found" });

    // Find or create session
    let session = await StudyMaterialChatSession.findOne({
      student: req.user.id,
      material: req.params.id,
    });

    if (!session) {
      session = new StudyMaterialChatSession({
        student: req.user.id,
        material: req.params.id,
        messages: [],
      });
    }

    // Extract text
    let fileText;
    try {
      fileText = await extractTextFromFile(material);
    } catch (extractErr) {
      console.error("Text extraction error:", extractErr);
      return res.status(400).json({ message: "Could not extract text from document: " + extractErr.message });
    }

    const truncatedText = (fileText || "").substring(0, 30000);

    // Build Gemini history (limit to last 15 messages to stay within token sizes)
    const maxHistoryMessages = session.messages.slice(-15);
    const history = maxHistoryMessages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const systemInstruction = `You are an expert computer science tutor and study assistant.
You are helping a student understand the following study material:
--- STUDY MATERIAL START ---
Title: ${material.title}
Subject: ${material.subject || "Not specified"}

${truncatedText}
--- STUDY MATERIAL END ---

Instructions:
1. Provide accurate, clear, and educational answers based on the study material.
2. If the user asks general questions about the topics in the material, explain them clearly using standard computer science concepts.
3. If the user asks questions that are completely unrelated to the study material or computer science, politely steer them back to studying.
4. Use rich markdown formatting (bold, code snippets, lists, tables) in your responses to make them easy to read.`;

    let responseText;
    const hasKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "mock_key_for_now";
    
    if (!hasKey) {
      responseText = `**[MOCK MODE: Gemini API key not configured]**\n\nI received your query: *"${message}"*.\n\nI parsed **${truncatedText.length}** characters from the document *"${material.originalName}"*.\n\nTo get full AI responses, please set a valid \`GEMINI_API_KEY\` in your \`.env\` file.`;
    } else {
      const candidateModels = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash"];
      let chatSuccess = false;
      let lastChatErr = null;

      for (const mName of candidateModels) {
        try {
          const { GoogleGenerativeAI } = require("@google/generative-ai");
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({
            model: mName,
            systemInstruction: systemInstruction,
          });

          const chat = model.startChat({ history });
          const result = await chat.sendMessage(message);
          responseText = result.response.text();
          chatSuccess = true;
          break;
        } catch (geminiError) {
          lastChatErr = geminiError;
          console.warn(`[Material Chat] Model ${mName} failed:`, geminiError.message);
        }
      }

      if (!chatSuccess) {
        console.warn("All Gemini models failed for material chat. Reason:", lastChatErr?.message);
        responseText = `**[FALLBACK MODE: Gemini API rate limited / overloaded]**\n\nYour query: *"${message}"* was received successfully.\n\nHowever, the Gemini API is currently experiencing heavy traffic or quota exhaustion.\n\nHere is a summary based on your document:\n- Document: **${material.title}**\n- Character Count parsed: **${truncatedText.length} characters**\n\nPlease wait a few moments and try your query again.`;
      }
    }

    // Append to messages in DB
    session.messages.push({ role: "user", content: message });
    session.messages.push({ role: "model", content: responseText });
    await session.save();

    res.json({
      success: true,
      userMessage: session.messages[session.messages.length - 2],
      modelMessage: session.messages[session.messages.length - 1],
    });
  } catch (err) {
    console.error("Chat response error:", err);
    res.status(500).json({ message: "Failed to get AI response: " + (err.message || "Server error") });
  }
});

// POST /api/materials/:id/chat/clear — reset chat thread
router.post("/:id/chat/clear", auth, async (req, res) => {
  try {
    await StudyMaterialChatSession.findOneAndDelete({
      student: req.user.id,
      material: req.params.id,
    });

    res.json({ success: true, message: "Chat history cleared" });
  } catch (err) {
    console.error("Clear chat error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.extractTextFromFile = extractTextFromFile;
module.exports = router;
