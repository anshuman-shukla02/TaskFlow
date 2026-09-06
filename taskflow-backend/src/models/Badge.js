const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "FIRST_SUBMISSION",     // Submitted first task
        "STREAK_7",             // 7-day submission streak
        "PERFECT_SCORE",        // 100% on a marked task
        "ALL_TASKS_COMPLETE",   // Completed all assigned tasks
        "TOP_PERFORMER",        // Highest avg score in division
        "FAST_LEARNER",         // Completed 5 tasks in a single day
        "AI_ACHIEVER",          // Got AI evaluation score > 90%
        "ADAPTIVE_MASTER",      // Completed all adaptive learning topics
      ],
      required: true,
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Unique compound index to prevent duplicate badges
badgeSchema.index({ userId: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Badge", badgeSchema);
