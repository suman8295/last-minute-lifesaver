// frontend/src/components/Dashboard.jsx
// Command Center — brain dump input, current focus widget, and task list.

import { useState } from "react";
import { Send, Loader2, Zap, AlertCircle, Clock } from "lucide-react";
import { useTasks } from "../hooks/useTasks";
import TaskCard from "./TaskCard";
import FrictionlessStart from "./FrictionlessStart";

// ── Status filter tabs ─────────────────────────────────────────────────────────
const FILTERS = ["ALL", "PENDING", "IN_PROGRESS", "DONE"];

export default function Dashboard() {
  const { tasks, topTask, loading, error, submitDump, updateTask, removeTask } = useTasks();

  const [dumpText, setDumpText]       = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [activeTask, setActiveTask]   = useState(null); // for FrictionlessStart modal
  const [filter, setFilter]           = useState("ALL");

  // ── Brain dump submit ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!dumpText.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setSessionInfo(null);
    try {
      const result = await submitDump(dumpText.trim());
      setSessionInfo({
        summary: result.session_summary,
        totalMin: result.total_estimated_minutes,
        count: result.tasks.length,
      });
      setDumpText("");
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtered tasks ─────────────────────────────────────────────────────────
  const filtered = filter === "ALL"
    ? tasks
    : tasks.filter((t) => t.status === filter);

  const pendingCount     = tasks.filter((t) => t.status === "PENDING").length;
  const inProgressCount  = tasks.filter((t) => t.status === "IN_PROGRESS").length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200 tracking-tight">
            Last-Minute Life Saver
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          {pendingCount > 0 && (
            <span>{pendingCount} pending</span>
          )}
          {inProgressCount > 0 && (
            <span className="text-indigo-400">{inProgressCount} in progress</span>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* ── Brain Dump Input ────────────────────────────────────────────── */}
        <section className="card p-5">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-widest mb-3">
            Brain Dump
          </label>

          <textarea
            value={dumpText}
            onChange={(e) => setDumpText(e.target.value)}
            onKeyDown={(e) => {
              // Cmd/Ctrl+Enter submits
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleSubmit();
            }}
            placeholder="Dump everything on your mind — tasks, deadlines, worries. The AI will extract and prioritize them.

e.g. I need to fix that API bug ASAP, also write the intro paragraph for my essay due tomorrow, and email Prof. Chen about the extension"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/60 transition-colors font-mono leading-relaxed"
            rows={5}
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-600">
              ⌘+Enter to submit  ·  {dumpText.length} chars
            </span>
            <button
              onClick={handleSubmit}
              disabled={!dumpText.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {submitting
                ? <Loader2 size={14} className="animate-spin" />
                : <Send size={14} />
              }
              {submitting ? "Parsing..." : "Extract Tasks"}
            </button>
          </div>

          {/* Error */}
          {submitError && (
            <div className="mt-3 flex items-start gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="mt-0.5 flex-shrink-0" />
              {submitError}
            </div>
          )}

          {/* Session result summary */}
          {sessionInfo && (
            <div className="mt-3 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              ✓ {sessionInfo.summary}
            </div>
          )}
        </section>

        {/* ── Current Focus ────────────────────────────────────────────────── */}
        {topTask && (
          <section className="card p-5 border-indigo-500/20 bg-indigo-500/5">
            <div className="text-xs font-medium uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-1.5">
              <Zap size={12} />
              Current Focus
            </div>

            <p className="text-base font-semibold text-slate-100 mb-1 leading-snug">
              {topTask.title}
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <Clock size={11} />
                ~{topTask.predictedDurationMin} min
              </span>
              <span className="font-mono text-slate-600">{topTask.category}</span>
              <span className={`font-medium ${
                topTask.urgency === "CRITICAL" ? "text-red-400" :
                topTask.urgency === "HIGH"     ? "text-orange-400" : "text-yellow-400"
              }`}>{topTask.urgency}</span>
            </div>

            <button
              onClick={() => setActiveTask(topTask)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start Now →
            </button>
          </section>
        )}

        {/* ── Task List ────────────────────────────────────────────────────── */}
        <section>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 mb-4">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                  filter === f
                    ? "bg-slate-800 text-slate-200"
                    : "text-slate-600 hover:text-slate-400"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>

          {loading && tasks.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-600 py-8 justify-center">
              <Loader2 size={14} className="animate-spin" />
              Loading tasks…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-slate-700 text-sm">
              {filter === "ALL"
                ? "No tasks yet. Drop a brain dump above to get started."
                : `No ${filter.toLowerCase().replace("_", " ")} tasks.`}
            </div>
          )}

          <div className="space-y-3">
            {filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStart={setActiveTask}
                onStatusChange={(id, patch) => updateTask(id, patch)}
                onRemove={removeTask}
              />
            ))}
          </div>
        </section>

        {/* Global loading error */}
        {error && (
          <div className="text-xs text-red-400 text-center">{error}</div>
        )}
      </div>

      {/* Frictionless Start Modal */}
      {activeTask && (
        <FrictionlessStart
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onStart={(id) => updateTask(id, { status: "IN_PROGRESS" })}
        />
      )}
    </div>
  );
}
