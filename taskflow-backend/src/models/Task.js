const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    topic: { type: String, default: "" },
    difficulty: { type: String, enum: ["none", "easy", "medium", "hard"], default: "none" },
    type: { type: String, enum: ["task", "project"], default: "task" },
    bloomLevel: {
      type: String,
      enum: ["none", "REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"],
      default: "none",
    },
    phases: [
      {
        milestone: { type: String, required: true },
        bloomLevel: {
          type: String,
          enum: ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"],
          default: "REMEMBER",
        },
        task: { type: String, required: true },
        type: { type: String, enum: ["INFO", "CODE", "URL"], required: true },
        content: { type: String, default: "" }, 
      }
    ],
    questions: [
      {
        text: { type: String, default: "" },
        marks: { type: Number, default: 1, min: 0 },
      }
    ],
    hasMarks: { type: Boolean, default: false },
    singleMarks: { type: Number, default: 10, min: 1 },
    dueDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Indexes
taskSchema.index({ createdBy: 1 });
taskSchema.index({ type: 1 });
taskSchema.index({ bloomLevel: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model("Task", taskSchema);
