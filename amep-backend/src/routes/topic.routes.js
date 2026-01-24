const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const {
  getTopicNotes,
  markNotesViewed,
} = require("../controllers/topic.controller");

router.get("/:topic/notes", auth, getTopicNotes);
router.post("/:topic/mark-viewed", auth, markNotesViewed);

module.exports = router;