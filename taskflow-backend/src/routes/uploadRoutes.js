const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadToS3 } = require("../utils/s3Storage");

// ────────────────────────── Storage Selection ──────────────────────────
const useS3 = process.env.AWS_ACCESS_KEY_ID && process.env.S3_BUCKET_NAME;

// Configure multer
const storage = useS3
  ? multer.memoryStorage() // S3 needs buffer
  : multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
      },
    });

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed! Only PDF and Image files are supported.`), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// POST /api/upload - handles single file upload
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    let fileUrl;
    let clientUrl;
    if (useS3) {
      const { getPresignedUrl } = require("../utils/s3Storage");
      fileUrl = await uploadToS3(req.file);
      // Return a presigned URL for the client to use immediately
      clientUrl = await getPresignedUrl(fileUrl);
    } else {
      // Local URL (development only)
      const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5002}`;
      fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      clientUrl = fileUrl;
    }

    res.json({
      success: true,
      message: "File uploaded successfully",
      fileUrl: fileUrl,       // s3:// URI for database storage
      clientUrl: clientUrl,   // Presigned URL for immediate client use
      filename: req.file.filename || req.file.originalname,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: "Server error during upload: " + error.message });
  }
});

module.exports = router;

