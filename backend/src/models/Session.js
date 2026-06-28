// backend/src/models/Session.js
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    rawInput:  { type: String, required: true },
    taskCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Session = mongoose.model("Session", sessionSchema);
