// frontend/src/components/FrictionlessStart.jsx
// The "Magic Moment" — shown when user clicks "Start Now".
// Displays AI-generated material to eliminate blank-page friction.

import { useState } from "react";
import { X, Copy, Check, Code2, FileText, Mail, BookOpen, Calendar } from "lucide-react";

const TYPE_META = {
  code:    { icon: Code2,     label: "Boilerplate Code",  color: "text-violet-400" },
  outline: { icon: FileText,  label: "Writing Outline",   color: "text-blue-400"   },
  draft:   { icon: Mail,      label: "Email Draft",       color: "text-emerald-400"},
  summary: { icon: BookOpen,  label: "Research Brief",    color: "text-amber-400"  },
};

export default function FrictionlessStart({ task, onClose, onStart }) {
  const [copied, setCopied] = useState(false);

  if (!task) return null;

  const material = task.startMaterial ?? {};
  const meta     = TYPE_META[material.type] ?? TYPE_META.outline;
  const Icon     = meta.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(material.content ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = () => {
    onStart(task.id);
    onClose();
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        className="relative w-full max-w-2xl card p-0 overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-800">
          <div>
            <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-widest mb-1 ${meta.color}`}>
              <Icon size={13} />
              {meta.label}
            </div>
            <h2 className="text-base font-semibold text-slate-100 leading-snug line-clamp-2">
              {task.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs text-slate-500 mb-3">
            AI-generated starter — copy it, then start.
          </p>
          <div className="code-block max-h-72 text-xs leading-relaxed">
            {material.content ?? "No start material available."}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 pb-5 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>

          <button
            onClick={handleStart}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Mark In Progress →
          </button>
        </div>
      </div>
    </div>
  );
}
