const mongoose = require("mongoose");

const TopicProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    topic: {
      type: String,
      required: true,
    },
    notesViewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TopicProgress", TopicProgressSchema);