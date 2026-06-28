// frontend/src/lib/api.js
// Centralised API client — all backend calls go through here.

const BASE = "/api"; // Vite proxy forwards to Express on :4000

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }

  return data;
}

export const api = {
  // Send brain dump → get structured tasks back
  parseDump: (text) =>
    request("/tasks", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  // Fetch all persisted tasks
  getTasks: () => request("/tasks"),

  // Update task status or duration
  updateTask: (id, patch) =>
    request(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  // Soft-delete (cancel) a task
  deleteTask: (id) =>
    request(`/tasks/${id}`, { method: "DELETE" }),
};
