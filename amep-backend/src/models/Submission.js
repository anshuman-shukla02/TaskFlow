const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true
    },

    topic: {
      type: String,
      required: true
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true
    },

    code: {
      type: String,
      required: true
    },

    isCorrect: {
      type: Boolean,
      required: true
    },

    performanceScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true
    },

    timeTaken: {
      type: Number,
      required: true
    },

    hintsUsed: {
      type: Number,
      min: 0,
      max: 2,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);