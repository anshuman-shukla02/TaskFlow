const mongoose = require("mongoose");

const conversationMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "model", "system"], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const studyMaterialChatSessionSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    material: { type: mongoose.Schema.Types.ObjectId, ref: "StudyMaterial", required: true },
    messages: [conversationMessageSchema],
  },
  { timestamps: true }
);

// Unique index to ensure exactly one session per student per study material
studyMaterialChatSessionSchema.index({ student: 1, material: 1 }, { unique: true });

module.exports = mongoose.model("StudyMaterialChatSession", studyMaterialChatSessionSchema);
