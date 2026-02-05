const Topic = require("../models/Topic");
const TopicProgress = require("../models/TopicProgress");

/**
 * GET topic notes
 */
exports.getTopicNotes = async (req, res) => {
  try {
    const { topic } = req.params;
    console.log(`[TopicController] Fetching notes for: ${topic}`);

    const topicData = await Topic.findOne({ name: topic });
    if (!topicData) {
      console.log(`[TopicController] Topic not found: ${topic}`);
      return res.status(404).json({ message: "Topic not found" });
    }

    console.log(`[TopicController] Found notes for ${topic} (${topicData.notes.length} items)`);
    res.json({
      topic: topicData.name,
      notes: topicData.notes,
    });
  } catch (error) {
    console.error("[TopicController] Error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Mark notes as viewed (unlock questions)
 */
exports.markNotesViewed = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { topic } = req.params;

    await TopicProgress.findOneAndUpdate(
      { userId, topic },
      { notesViewed: true },
      { upsert: true, new: true }
    );

    res.json({ message: "Notes marked as viewed. Topic unlocked." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};