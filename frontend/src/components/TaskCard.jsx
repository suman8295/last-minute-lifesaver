// frontend/src/components/TaskCard.jsx
// Displays a single task with urgency badge, duration, deadline, and actions.

import { Clock, Trash2, CheckCircle2, PlayCircle } from "lucide-react";

const URGENCY_CLASS = {
  CRITICAL: "badge-critical",
  HIGH:     "badge-high",
  MEDIUM:   "badge-medium",
  LOW:      "badge-low",
};

const STATUS_CLASS = {
  PENDING:     "text-slate-400",
  IN_PROGRESS: "text-indigo-400",
  DONE:        "text-emerald-400 line-through",
  CANCELLED:   "text-slate-600 line-through",
};

function formatDeadline(dl) {
  if (!dl) return null;
  const diff = new Date(dl) - Date.now();
  const h = Math.round(diff / 3_600_000);
  if (h < 0) return "Overdue";
  if (h < 1) return "< 1 hr";
  if (h < 24) return `${h}h left`;
  return `${Math.round(h / 24)}d left`;
}

export default function TaskCard({ task, onStart, onStatusChange, onRemove }) {
  const deadlineLabel = formatDeadline(task.deadline);
  const isDone        = task.status === "DONE";

  return (
    <div className={`card p-4 transition-opacity ${isDone ? "opacity-50" : ""}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={`text-sm font-medium leading-snug ${STATUS_CLASS[task.status]}`}>
          {task.title}
        </span>

        {/* Urgency badge */}
        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLASS[task.urgency]}`}>
          {task.urgency}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {task.predictedDurationMin} min
        </span>

        <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-xs font-mono">
          {task.category}
        </span>

        {deadlineLabel && (
          <span className={deadlineLabel === "Overdue" ? "text-red-400" : "text-slate-400"}>
            ⏱ {deadlineLabel}
          </span>
        )}

        {/* AI confidence */}
        <span className="ml-auto text-slate-600">
          {Math.round((task.aiConfidence ?? 0) * 100)}% conf.
        </span>
      </div>

      {/* Actions */}
      {!isDone && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onStart(task)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
          >
            <PlayCircle size={13} />
            Start Now
          </button>

          <button
            onClick={() => onStatusChange(task.id, { status: "DONE" })}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 hover:bg-emerald-600/20 text-slate-500 hover:text-emerald-400 rounded-lg transition-colors"
          >
            <CheckCircle2 size={13} />
            Done
          </button>

          <button
            onClick={() => onRemove(task.id)}
            className="ml-auto text-slate-700 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
