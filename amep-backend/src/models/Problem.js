const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true
    },
    output: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      required: true
    },

    topic: {
      type: String,
      required: true,
      lowercase: true
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true
    },

    hints: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length === 2;
        },
        message: "Exactly 2 hints are required"
      }
    },

    constraints: {
      type: [String],
      default: []
    },

    testCases: {
      type: [testCaseSchema],
      default: []
    },

    order: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Problem", problemSchema);