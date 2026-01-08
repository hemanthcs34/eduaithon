# CourseTwin - Complete Project Specification

## Overview

**CourseTwin** is a cutting-edge, AI-powered Adaptive Learning Platform. It creates a "digital twin" of a course by understanding its content through multi-modal AI (Vision, Text, Audio) to provide an interactive, personalized, and efficient learning experience.

It solves key problems in online education:
1.  **Passive Learning**: Solved with interactive quizzes and diagram grading.
2.  **Lack of Feedback**: Solved with AI Tutors and visual engagement tracking.
3.  **One-Size-Fits-All**: Solved with adaptive alternate learning paths.

---

## Tech Stack

| Layer | Technology | Details |
|-------|------------|---------|
| **Frontend** | Next.js 14 | React, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | FastAPI | Python 3.11+, Async SQLAlchemy, Pydantic |
| **Database** | PostgreSQL | Relational Data |
| **Vector DB** | ChromaDB | Embeddings for RAG (PDFs + Transcripts) |
| **AI (Text)** | Ollama / Groq | Local Llama 3/Qwen (Edge) -> Cloud Fallback |
| **AI (Vision)** | MediaPipe | Client-side Face Detection (WASM) |
| **AI (Hybrid)** | MobileNetV3 + Gemini | Local Classification + Cloud Semantics |

---

## Key Features

### 1. 🧠 Diagram Intelligence Tutor
*   **What**: Grades hand-drawn diagrams (e.g., CNN architectures).
*   **How**: Uses Multimodal LLMs (Llama Vision) to OCR text and analyze structural connections.
*   **Teacher View**: Side-by-side comparison of student drawing and AI feedback.

### 2. 👁️ Anti-Skip Visual Engagement (Soft Mode)
*   **What**: Privacy-first attention tracking using the webcam.
*   **How**:
    *   **MediaPipe** runs locally in browser.
    *   Detects distractions (>10s look-away).
    *   **Auto-Pauses** video on distraction.
    *   Suggests breaks after 3 repeated distractions.

### 3. 📝 Context-Aware Smart Quizzes
*   **What**: Generates quizzes from the *actual* video content and uploaded PDFs.
*   **How**: RAG pipeline retrieves relevant chunks -> LLM generates strict Q&A.
*   **Gating**: Unlocks next videos only upon passing.

### 4. 🤖 AI Course Chatbot (RAG)
*   **What**: Answers student questions based *only* on course material.
*   **How**: Hybrid AI (Local Ollama first, Groq Cloud fallback) for reliability and cost-efficiency.

### 5. 🔒 Enforced Learning (Hard Mode)
*   **What**: Prevents seeking ahead in unwatched videos.
*   **How**: Tracks `max_watched_seconds` in DB and snaps player back if user tries to skip.

### 6. 👁️ Visual Exploration Lab
*   **What**: Sandbox for students to understand Computer Vision.
*   **How**: Shows "Local Classification" (Fast) vs. "Cloud Understanding" (Smart) side-by-side.

### 7. 📺 Alternate Learning Paths
*   **What**: Suggests YouTube alternatives if a student struggles.
*   **How**: Semantic search based on video topics.

---

## 👨‍💻 Developer Implementation Notes (Critical Context)

### 1. Visual Engagement Logic (Soft Mode)
*   **Thresholds**: We use a **strict 0.85 confidence threshold** for `MediaPipe` face detection. This intentionally filters out 90° side profiles to ensure students are looking *at* the screen.
*   **Focus Session**: To prevent "flickering" between generic statuses, we use a **60-minute trend window**. Distraction counts persist for the session unless a break is active.
*   **Pause Logic**: The `AttentionMonitor` uses a `ref` (`lastProcessedEventRef`) to track handled distraction events. This prevents React render loops from continuously pausing the video.

### 2. Diagram Intelligence Tutor (Vision LLM)
*   **Model Strategy**: We utilize **Llama 3.2 11B Vision** (via Groq) for its superior handling of spatial relationships compared to standard OCR.
*   **Prompt Engineering**: The backend strictly enforces a JSON schema return (`Action`, `Where`, `Why`) to ensure the frontend can parse and display structured feedback alongside the image.
*   **Teacher View**: We store the raw base64 image and the AI analysis JSON separately, allowing the teacher dashboard to reconstruct the "Grading View".

### 3. Hybrid AI Architecture (Chat & Vision)
*   **Edge-First**: The system defaults to **Local Ollama** (Llama 3/Qwen) for chat and **MobileNetV3** for basic vision. This ensures privacy and zero cost.
*   **Cloud Fallback**: If the local model times out (>5s) or fails, we transparently switch to **Groq** (Cloud Llama 3) or **Gemini Pro**. This logic is wrapped in the `generate_response` try-except blocks in `core/chat.py`.

### 4. Smart Quiz & RAG
*   **Hallucination Control**: We inject a strict system prompt: *"Only use the provided video summaries. Do not use external knowledge."* This prevents the AI from asking questions about topics not yet covered.
*   **Triggers**: Quizzes are checking `VideoProgress` db table. Logic triggers exactly when `count(watched_videos) % 3 == 0`.

### 5. Enforced Learning (Hard Mode)
*   **Optimization**: We do NOT hit the DB on every `timeUpdate` (which fires 4 times/sec). Instead, the frontend tracks `max_watched` locally and syncs to the backend every 5 seconds debounced.
*   **Security**: Server-side validation rejects any progress update > `last_max + 15s` to prevent API spoofing.

### 6. Alternate Learning Paths
*   **Semantic Search**: We don't just search the title. We extract keywords from the *description* to find conceptually similar YouTube videos, filtering for "high educational value" channels where possible.

---

## Project Structure

```
course-twin/
├── backend/
│   ├── app/
│   │   ├── api/api_v1/endpoints/  # Routes (auth, vision, quiz, chat...)
│   │   ├── core/                   # Logic (rag.py, vision.py, ollama.py...)
│   │   ├── models/                 # DB Models (User, Video, Quiz...)
│   │   └── ...
├── frontend/
│   ├── src/app/                    # Next.js Pages (student/, teacher/...)
│   ├── src/components/             # UI (AttentionMonitor, DiagramUpload...)
│   ├── src/hooks/                  # Logic (useAttentionTracker...)
│   └── ...
└── .env                            # Secrets (GROQ_KEY, DB_URL...)
```

---

## API Endpoints (Key Routes)

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Vision** | POST | `/api/v1/vision/analyze` | Hybrid Image Analysis |
| **Diagrams** | POST | `/api/v1/diagrams/analyze` | Grade Student Drawing |
| **Quiz** | POST | `/api/v1/quiz/generate` | Generate RAG Quiz |
| **Chat** | POST | `/api/v1/chat/{course_id}` | Talk to AI Tutor |
| **Videos** | GET | `/videos/{id}/alternates` | Get YouTube Recommendations |
| **Auth** | POST | `/api/v1/auth/login` | JWT Authentication |

---

## Database Schema (Simplified)

*   **User**: `id, email, role (TEACHER/STUDENT)`
*   **Course**: `id, title, materials (PDFs)`
*   **Video**: `id, title, max_watched (UserProgress)`
*   **Quiz**: `id, trigger_video_index, questions (JSON)`
*   **DiagramSubmission**: `id, image_path, feedback (JSON)`

---

## Running the Project

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   Ollama (running locally)

### Quick Start
1.  **Backend**:
    ```bash
    cd backend
    .\run_backend.bat
    ```
2.  **Frontend**:
    ```bash
    cd frontend
    .\run_frontend.bat
    ```
3.  **Access**: `http://localhost:3000`

---
*Updated: Jan 2026*
