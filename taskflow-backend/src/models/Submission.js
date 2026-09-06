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
    // AI Automated Pre-Evaluation Fields
    aiEvaluation: {
      suggestedScore: { type: Number, default: null },
      suggestedStatus: {
        type: String,
        enum: ["APPROVED", "REJECTED", "PENDING", null],
        default: null,
      },
      suggestedFeedback: { type: String, default: "" },
      questionScores: [
        {
          questionIndex: { type: Number },
          score: { type: Number, default: 0 },
          feedback: { type: String, default: "" },
        }
      ],
      evaluatedAt: { type: Date, default: null },
      isFacultyAccepted: { type: Boolean, default: false },
    },
    // Plagiarism Check Fields
    plagiarismCheck: {
      score: { type: Number, default: null },          // 0-100 similarity %
      flagged: { type: Boolean, default: false },       // true if score > threshold
      matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", default: null },
      matchedStudentName: { type: String, default: "" },
      summary: { type: String, default: "" },           // AI explanation
      checkedAt: { type: Date, default: null },
    },
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
