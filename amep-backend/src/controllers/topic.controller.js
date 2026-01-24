const Topic = require("../models/Topic");
const TopicProgress = require("../models/TopicProgress");

/**
 * GET topic notes
 */
exports.getTopicNotes = async (req, res) => {
  try {
    const { topic } = req.params;

    const topicData = await Topic.findOne({ name: topic });
    if (!topicData) {
      return res.status(404).json({ message: "Topic not found" });
    }

    res.json({
      topic: topicData.name,
      notes: topicData.notes,
    });
  } catch (error) {
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