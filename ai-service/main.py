# ai-service/main.py
# AI Microservice — The Last-Minute Life Saver
# Responsible for: task extraction, urgency detection, duration prediction,
# and "Frictionless Start" material generation.
#
# In production this calls an LLM (e.g. GPT-4o or Gemini).
# For the hackathon demo we use a smart rule-based extractor + realistic mock LLM responses.

import re
import json
import time
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Life Saver AI Service",
    description="LLM orchestration layer — task extraction, prediction, and frictionless start generation",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Request / Response Schemas ───────────────────────────────────────────────

class BrainDumpRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Raw, chaotic brain dump from the user")
    user_id: Optional[str] = None

class ExtractedTask(BaseModel):
    title: str
    description: str
    category: str          # CODING | WRITING | RESEARCH | EMAIL | MEETING | OTHER
    urgency: str           # LOW | MEDIUM | HIGH | CRITICAL
    predicted_duration_min: int
    deadline_offset_hours: Optional[int]  # hours from now; None = no deadline detected
    ai_confidence: float
    start_material: dict   # { type, content }

class ParseDumpResponse(BaseModel):
    tasks: list[ExtractedTask]
    session_summary: str
    total_estimated_minutes: int
    processing_time_ms: int

# ─── Rule-based helpers ───────────────────────────────────────────────────────

URGENCY_KEYWORDS = {
    "CRITICAL": ["asap", "urgent", "emergency", "immediately", "right now", "tonight", "due today"],
    "HIGH":     ["tomorrow", "by end of day", "eod", "this afternoon", "in a few hours", "deadline"],
    "MEDIUM":   ["this week", "soon", "later today", "next couple days"],
    "LOW":      ["eventually", "someday", "when i get a chance", "low priority"],
}

CATEGORY_KEYWORDS = {
    "CODING":    ["code", "bug", "api", "function", "deploy", "git", "debug", "feature", "implement"],
    "WRITING":   ["essay", "write", "draft", "blog", "article", "report", "paragraph", "paper"],
    "RESEARCH":  ["research", "look up", "find out", "study", "read", "review", "investigate"],
    "EMAIL":     ["email", "mail", "reply", "respond", "reach out", "follow up", "message"],
    "MEETING":   ["meeting", "call", "standup", "sync", "presentation", "demo", "interview"],
}

DURATION_ESTIMATES = {
    "CODING":   90,
    "WRITING":  60,
    "RESEARCH": 45,
    "EMAIL":    15,
    "MEETING":  60,
    "OTHER":    30,
}

def detect_urgency(text: str) -> str:
    lower = text.lower()
    for level, keywords in URGENCY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return level
    return "MEDIUM"

def detect_category(text: str) -> str:
    lower = text.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return cat
    return "OTHER"

def extract_deadline_hours(text: str) -> Optional[int]:
    """Heuristic deadline extraction from natural language."""
    lower = text.lower()
    if any(w in lower for w in ["tonight", "today", "asap", "right now"]):
        return 6
    if "tomorrow" in lower:
        return 24
    if "this week" in lower:
        return 96
    m = re.search(r"in (\d+) hours?", lower)
    if m:
        return int(m.group(1))
    return None

def split_into_tasks(text: str) -> list[str]:
    """
    Split a brain dump into individual task fragments.
    Splits on: line breaks, bullet/dash markers, semicolons, and
    conjunctions like 'also', 'and then', 'plus', 'oh and'.
    """
    # Normalize list markers
    text = re.sub(r"[-•*]\s+", "\n", text)
    # Split on common connectors
    text = re.sub(r"\b(also|and then|plus|oh and|then i need to)\b", "\n", text, flags=re.IGNORECASE)
    # Split on semicolons / line breaks
    chunks = re.split(r"[;\n]+", text)
    # Filter noise
    return [c.strip() for c in chunks if len(c.strip()) > 8]

# ─── Frictionless Start material generation (mock LLM) ───────────────────────

def generate_start_material(title: str, category: str) -> dict:
    """
    In production: calls LLM with a carefully crafted prompt.
    Here: returns realistic, category-specific boilerplate so the demo feels real.
    """
    templates = {
        "CODING": {
            "type": "code",
            "content": f"""# Frictionless Start — {title}
# Generated boilerplate to eliminate the blank-page problem

def main():
    \"\"\"
    Task: {title}
    
    TODO:
    1. Define inputs and expected outputs
    2. Implement core logic here
    3. Add error handling
    4. Write tests
    \"\"\"
    pass

if __name__ == "__main__":
    main()
""",
        },
        "WRITING": {
            "type": "outline",
            "content": f"""# Writing Outline — {title}

**Hook / Opening:** [Start with a surprising fact or bold claim]

**Section 1 — Context**
- Background: Why does this matter?
- Current situation: What's happening now?

**Section 2 — Core Argument / Body**
- Point A: [Your strongest argument]
- Point B: [Supporting evidence]
- Point C: [Counter-argument + rebuttal]

**Section 3 — Conclusion**
- Restate the core idea in a fresh way
- Call to action or key takeaway

---
*First sentence to get you started:*
"Every meaningful piece of writing begins with a single question worth answering — and for {title}, that question is..."
""",
        },
        "EMAIL": {
            "type": "draft",
            "content": f"""Subject: {title}

Hi [Name],

I wanted to follow up on [context]. Here's a quick summary of where things stand:

- [Point 1]
- [Point 2]

[One-sentence ask or next step]

Let me know if you have any questions.

Best,
[Your name]
""",
        },
        "RESEARCH": {
            "type": "summary",
            "content": f"""# Research Brief — {title}

## Key Questions to Answer
1. What is the current state of [topic]?
2. What are the main approaches / options?
3. What are the trade-offs?
4. What do experts / sources recommend?

## Suggested Sources
- Google Scholar / academic papers
- Official documentation
- Recent blog posts (past 12 months)
- Hacker News / Reddit discussions

## Output Format
Deliver a 1-page summary with: findings, recommendation, and confidence level.
""",
        },
        "MEETING": {
            "type": "outline",
            "content": f"""# Meeting Prep — {title}

**Goal of this meeting:** [One sentence]

**Agenda (timebox each item):**
- [ ] 0–5 min: Context / recap
- [ ] 5–15 min: Main discussion — [topic]
- [ ] 15–20 min: Decisions needed
- [ ] 20–25 min: Action items + owners

**My talking points:**
1. 
2. 
3. 

**Questions I need answered:**
- 
"""
        },
    }

    return templates.get(category, {
        "type": "outline",
        "content": f"# Task: {title}\n\n- Step 1:\n- Step 2:\n- Step 3:\n",
    })

# ─── Main endpoint ─────────────────────────────────────────────────────────────

@app.post("/api/parse-dump", response_model=ParseDumpResponse)
async def parse_dump(req: BrainDumpRequest):
    """
    Core AI endpoint.
    Accepts a raw brain dump and returns structured tasks with
    urgency, duration estimates, deadlines, and frictionless start materials.
    """
    t_start = time.time()

    raw = req.text.strip()
    if not raw:
        raise HTTPException(status_code=400, detail="Brain dump text is empty.")

    fragments = split_into_tasks(raw)

    if not fragments:
        raise HTTPException(status_code=422, detail="Could not extract any tasks from the input.")

    tasks: list[ExtractedTask] = []

    for fragment in fragments:
        category = detect_category(fragment)
        urgency   = detect_urgency(fragment)
        deadline  = extract_deadline_hours(fragment)

        # Adjust duration based on urgency (compressed timelines = shorter estimates)
        base_duration = DURATION_ESTIMATES[category]
        if urgency == "CRITICAL":
            duration = max(15, int(base_duration * 0.6))
        elif urgency == "HIGH":
            duration = max(20, int(base_duration * 0.8))
        else:
            duration = base_duration

        # Confidence is higher when we detect clear category + urgency signals
        signals = int(bool(detect_category(fragment) != "OTHER")) + int(bool(deadline))
        confidence = round(0.65 + signals * 0.12, 2)

        start_material = generate_start_material(fragment, category)

        tasks.append(ExtractedTask(
            title=fragment[:120],
            description=fragment,
            category=category,
            urgency=urgency,
            predicted_duration_min=duration,
            deadline_offset_hours=deadline,
            ai_confidence=confidence,
            start_material=start_material,
        ))

    # Sort by urgency priority
    urgency_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    tasks.sort(key=lambda t: urgency_order[t.urgency])

    total_min = sum(t.predicted_duration_min for t in tasks)
    elapsed_ms = int((time.time() - t_start) * 1000)

    return ParseDumpResponse(
        tasks=tasks,
        session_summary=(
            f"Extracted {len(tasks)} task(s) from your brain dump. "
            f"Total estimated time: {total_min} minutes. "
            f"Top priority: {tasks[0].urgency} — \"{tasks[0].title[:60]}\"."
        ),
        total_estimated_minutes=total_min,
        processing_time_ms=elapsed_ms,
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-microservice", "timestamp": datetime.utcnow().isoformat()}
