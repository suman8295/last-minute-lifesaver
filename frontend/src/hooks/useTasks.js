// frontend/src/hooks/useTasks.js
// Central state management for tasks — keeps UI, API, and DB in sync.

import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

export function useTasks() {
  const [tasks, setTasks]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // ── Load persisted tasks on mount ─────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTasks();
      setTasks(data.tasks ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Submit brain dump ──────────────────────────────────────────────────────
  const submitDump = useCallback(async (text) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.parseDump(text);
      // Prepend new tasks at the top
      setTasks((prev) => [...result.tasks, ...prev]);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Update a task locally + in DB ──────────────────────────────────────────
  const updateTask = useCallback(async (id, patch) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );
    try {
      const { task } = await api.updateTask(id, patch);
      setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    } catch (err) {
      // Roll back on failure
      setError(err.message);
      fetchTasks();
    }
  }, [fetchTasks]);

  // ── Remove a task ──────────────────────────────────────────────────────────
  const removeTask = useCallback(async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTask(id);
    } catch (err) {
      setError(err.message);
      fetchTasks();
    }
  }, [fetchTasks]);

  // Highest-priority pending task
  const topTask = tasks.find((t) => t.status === "PENDING") ?? null;

  return { tasks, topTask, loading, error, submitDump, updateTask, removeTask };
}
