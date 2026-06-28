// backend/src/server.js
// Main Express server — MongoDB/Mongoose edition.

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import fetch from "node-fetch";
import dotenv from "dotenv";

import { User }    from "./models/User.js";
import { Task }    from "./models/Task.js";
import { Session } from "./models/Session.js";

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT       = process.env.PORT        ?? 4000;
const AI_SERVICE = process.env.AI_SERVICE_URL ?? "http://localhost:8000";
const DEMO_USER  = process.env.DEMO_USER_ID   ?? "demo-user-001";
const MONGO_URI  = process.env.MONGODB_URI;

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// ─── DB Connection ────────────────────────────────────────────────────────────

async function connectDB() {
  await mongoose.connect(MONGO_URI);
  console.log(`✅  MongoDB connected: ${MONGO_URI}`);

  // Seed demo user (upsert — safe to run on every boot)
  await User.updateOne(
    { _id: DEMO_USER },
    { $setOnInsert: { _id: DEMO_USER, email: "demo@lifesaver.app", name: "Demo User" } },
    { upsert: true }
  );
}

// ─── Urgency sort helper ──────────────────────────────────────────────────────

const URGENCY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

function sortByPriority(tasks) {
  return tasks.sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urgencyDiff !== 0) return urgencyDiff;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/tasks
 * Brain dump pipeline: forward to AI service → save to MongoDB → return tasks.
 */
app.post("/api/tasks", async (req, res) => {
  const { text, userId = DEMO_USER } = req.body;

  if (!text || text.trim().length < 5) {
    return res.status(400).json({ error: "Brain dump text is too short." });
  }

  // 1. Call AI microservice
  let aiResult;
  try {
    const aiRes = await fetch(`${AI_SERVICE}/api/parse-dump`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ text, user_id: userId }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return res.status(502).json({ error: "AI service failed.", detail: errText });
    }

    aiResult = await aiRes.json();
  } catch (err) {
    return res.status(503).json({
      error: "AI service is unreachable. Is it running on port 8000?",
    });
  }

  // 2. Persist session + tasks in parallel
  try {
    // Save the session record
    await Session.create({
      userId,
      rawInput:  text,
      taskCount: aiResult.tasks.length,
    });

    // Build and insert task documents
    const taskDocs = aiResult.tasks.map((t) => ({
      userId,
      title:                t.title,
      description:          t.description,
      category:             t.category,
      urgency:              t.urgency,
      status:               "PENDING",
      rawDump:              text,
      predictedDurationMin: t.predicted_duration_min,
      aiConfidence:         t.ai_confidence,
      startMaterial:        t.start_material,
      deadline:
        t.deadline_offset_hours != null
          ? new Date(Date.now() + t.deadline_offset_hours * 3_600_000)
          : null,
    }));

    const savedTasks = await Task.insertMany(taskDocs);

    return res.status(201).json({
      tasks:                   sortByPriority(savedTasks.map((t) => t.toObject())),
      session_summary:         aiResult.session_summary,
      total_estimated_minutes: aiResult.total_estimated_minutes,
      processing_time_ms:      aiResult.processing_time_ms,
    });
  } catch (err) {
    console.error("DB write failed:", err);
    return res.status(500).json({ error: "Failed to save tasks.", detail: err.message });
  }
});

/**
 * GET /api/tasks
 * Fetch all non-cancelled tasks for a user, sorted by urgency + deadline.
 */
app.get("/api/tasks", async (req, res) => {
  const userId = req.query.userId ?? DEMO_USER;

  try {
    const tasks = await Task.find({ userId, status: { $ne: "CANCELLED" } })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ tasks: sortByPriority(tasks) });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch tasks.", detail: err.message });
  }
});

/**
 * PATCH /api/tasks/:id
 * Update status, actual duration, etc.
 */
app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { status, actualDurationMin } = req.body;

  const updates = {};
  if (status)              updates.status = status;
  if (actualDurationMin)   updates.actualDurationMin = actualDurationMin;
  if (status === "IN_PROGRESS") updates.startedAt   = new Date();
  if (status === "DONE")        updates.completedAt = new Date();

  try {
    const task = await Task.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!task) return res.status(404).json({ error: "Task not found." });
    return res.json({ task });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update task.", detail: err.message });
  }
});

/**
 * DELETE /api/tasks/:id  — soft delete via CANCELLED status
 */
app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const task = await Task.findByIdAndUpdate(id, { $set: { status: "CANCELLED" } });
    if (!task) return res.status(404).json({ error: "Task not found." });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete task.", detail: err.message });
  }
});

/**
 * GET /api/tasks/:id/start-material
 */
app.get("/api/tasks/:id/start-material", async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).select("startMaterial").lean();
    if (!task) return res.status(404).json({ error: "Task not found." });
    return res.json({ start_material: task.startMaterial });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch start material." });
  }
});

/**
 * GET /health
 */
app.get("/health", (_req, res) =>
  res.json({
    status:    "ok",
    service:   "backend",
    db:        mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  })
);

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`✅  Backend running on http://localhost:${PORT}`));
}

start().catch((err) => {
  console.error("Startup error:", err);
  process.exit(1);
});
