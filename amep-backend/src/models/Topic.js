const mongoose = require("mongoose");

const TopicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // arrays, strings, etc.
    },
    order: {
      type: Number,
      required: true,
    },
    notes: {
      type: String,
      required: true, // markdown / html
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Topic", TopicSchema);