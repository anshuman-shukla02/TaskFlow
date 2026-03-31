const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    topic: { type: String, default: "" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    type: { type: String, enum: ["task", "project"], default: "task" },
    bloomLevel: {
      type: String,
      enum: ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"],
      default: "REMEMBER",
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
