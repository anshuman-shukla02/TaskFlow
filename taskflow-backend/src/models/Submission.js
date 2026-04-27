const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, default: "" },
    fileUrl: { type: String, default: null },
    performanceScore: { type: Number, default: 0 },
    topic: { type: String, default: "" },
    bloomLevel: {
      type: String,
      enum: ["none", "REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"],
      default: "none",
    },
    // Project-specific fields
    milestoneId: { type: Number, default: null },
    reviewStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    reviewFeedback: { type: String, default: "" },
    // Question-based task fields
    questionAnswers: [
      {
        questionIndex: { type: Number },
        answer: { type: String, default: "" },
        fileUrl: { type: String, default: null },
      }
    ],
    questionScores: [
      {
        questionIndex: { type: Number },
        score: { type: Number, default: 0 },
      }
    ],
    countForProgress: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes
submissionSchema.index({ userId: 1 });
submissionSchema.index({ taskId: 1 });
submissionSchema.index({ topic: 1 });
submissionSchema.index({ bloomLevel: 1 });
submissionSchema.index({ createdAt: 1 });

module.exports = mongoose.model("Submission", submissionSchema);
