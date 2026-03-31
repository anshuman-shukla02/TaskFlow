const mongoose = require("mongoose");

const studyMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    subject: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["pdf", "ppt", "pptx", "txt", "doc", "docx"],
      required: true,
    },
    fileSize: { type: Number, default: 0 },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyMaterial", studyMaterialSchema);
