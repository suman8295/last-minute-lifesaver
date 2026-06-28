# Last-Minute Life Saver

An AI-powered productivity tool that transforms chaotic brain dumps into structured, prioritized tasks — with AI-generated "Frictionless Start" materials to eliminate blank-page friction.

---

## Architecture

```
┌─────────────────┐     POST /api/tasks      ┌─────────────────────┐
│  React Frontend │ ─────────────────────── ▶ │  Express Backend    │
│  (Vite :5173)   │ ◀ ─────────────────────── │  (Node.js :4000)   │
└─────────────────┘     tasks + summary       └──────────┬──────────┘
                                                         │  POST /api/parse-dump
                                                         ▼
                                              ┌─────────────────────┐
                                              │  AI Microservice    │
                                              │  (FastAPI :8000)    │
                                              └──────────┬──────────┘
                                                         │  Mongoose ODM
                                                         ▼
                                              ┌─────────────────────┐
                                              │  MongoDB :27017     │
                                              └─────────────────────┘
```

---

## Project Structure

```
last-minute-lifesaver/
├── ai-service/
│   ├── main.py              # FastAPI — task extraction + start material generation
│   ├── requirements.txt
│   └── Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── models/
│   │   │   ├── User.js      # Mongoose User schema
│   │   │   ├── Task.js      # Mongoose Task schema
│   │   │   └── Session.js   # Mongoose Session schema
│   │   └── server.js        # Express — CRUD + AI proxy + Mongoose
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   └── FrictionlessStart.jsx
│   │   ├── hooks/useTasks.js
│   │   ├── lib/api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── ...
│
└── docker-compose.yml
```

---

## Quick Start

### Option A — Docker

```bash
docker compose up --build
```
Open: http://localhost:5173

---

### Option B — Manual

See setup instructions below.

---

## API Reference

### Backend (port 4000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tasks` | Submit brain dump → AI → save to MongoDB |
| GET | `/api/tasks` | Get all tasks sorted by urgency + deadline |
| PATCH | `/api/tasks/:id` | Update status or actual duration |
| DELETE | `/api/tasks/:id` | Soft-delete (marks CANCELLED) |
| GET | `/api/tasks/:id/start-material` | Get Frictionless Start material |
| GET | `/health` | Health check (includes DB connection status) |

### AI Microservice (port 8000)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/parse-dump` | Extract tasks from brain dump |
| GET | `/docs` | Swagger UI |
