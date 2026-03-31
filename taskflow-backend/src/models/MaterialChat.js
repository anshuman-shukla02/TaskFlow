const mongoose = require("mongoose");

const materialChatSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    material: { type: mongoose.Schema.Types.ObjectId, ref: "StudyMaterial", required: true },
    queryType: { type: String, required: true },
    response: { type: String, required: true },
  },
  { timestamps: true }
);

// Ensure uniqueness per student, material, and query type
materialChatSchema.index({ student: 1, material: 1, queryType: 1 }, { unique: true });

module.exports = mongoose.model("MaterialChat", materialChatSchema);
