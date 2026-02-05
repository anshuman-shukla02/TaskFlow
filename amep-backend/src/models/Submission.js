const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false, // Optional for Project Milestones
    },

    // ✅ PBL Fields
    type: {
      type: String,
      enum: ["TASK", "PROJECT_MILESTONE"],
      default: "TASK",
    },

    milestoneId: {
      type: Number, // 1, 2, 3...
    },

    reviewStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED", // Tasks are auto-approved
    },

    reviewFeedback: {
      type: String,
    },

    topic: {
      type: String,
      required: true,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },

    bloomLevel: {
      type: String,
      enum: [
        "REMEMBER",
        "UNDERSTAND",
        "APPLY",
        "ANALYZE",
        "EVALUATE",
        "CREATE",
      ],
      required: true,
    },

    fileUrl: {
      type: String,
    },

    code: {
      type: String, // Can be empty if file uploaded
    },

    isCorrect: {
      type: Boolean,
      default: false,
    },

    performanceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    timeTaken: {
      type: Number,
      default: 0,
    },

    hintsUsed: {
      type: Number,
      min: 0,
      max: 2,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Submission", submissionSchema);