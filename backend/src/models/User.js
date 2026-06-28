// backend/src/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    _id:   { type: String },          // use cuid / string IDs to match old API shape
    email: { type: String, required: true, unique: true },
    name:  { type: String, default: "Demo User" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
