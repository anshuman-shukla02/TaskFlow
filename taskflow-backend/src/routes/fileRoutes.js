const router = require("express").Router();
const auth = require("../middleware/auth");
const { getPresignedUrl } = require("../utils/s3Storage");

/**
 * POST /api/file/presign
 * Body: { url: "s3://..." or "https://...amazonaws.com/..." }
 * Returns: { success: true, presignedUrl: "https://..." }
 */
router.post("/presign", auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }

    const presignedUrl = await getPresignedUrl(url);
    res.json({ success: true, presignedUrl });
  } catch (err) {
    console.error("Presign error:", err);
    res.status(500).json({ success: false, message: "Failed to generate download URL" });
  }
});

module.exports = router;
