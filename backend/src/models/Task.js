// backend/src/models/Task.js
import mongoose from "mongoose";

const startMaterialSchema = new mongoose.Schema(
  {
    type:    { type: String, enum: ["code", "outline", "draft", "summary"] },
    content: { type: String },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    userId:      { type: String, required: true, index: true },

    // Core task data
    title:       { type: String, required: true },
    description: { type: String },
    category:    {
      type:    String,
      enum:    ["CODING", "WRITING", "RESEARCH", "EMAIL", "MEETING", "OTHER"],
      default: "OTHER",
    },
    status: {
      type:    String,
      enum:    ["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"],
      default: "PENDING",
      index:   true,
    },
    urgency: {
      type:    String,
      enum:    ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    // AI-generated fields
    rawDump:              { type: String },
    predictedDurationMin: { type: Number },
    actualDurationMin:    { type: Number },
    aiConfidence:         { type: Number, min: 0, max: 1 },
    startMaterial:        { type: startMaterialSchema },

    // Scheduling
    deadline:    { type: Date },
    startedAt:   { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Compound index for priority sorting queries
taskSchema.index({ userId: 1, urgency: 1, deadline: 1 });

export const Task = mongoose.model("Task", taskSchema);
