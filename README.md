# CourseTwin Lite

CourseTwin Lite is a next-generation AI-powered educational platform for computer vision that focuses on measuring learning evidence instead of content consumption.
Instead of assuming that watching videos means learning, CourseTwin observes how students interact, perceive, reason, and correct mistakes — and adapts learning accordingly.

It enables students to learn through visual interaction, AI-assisted explanations, and adaptive assessment, while giving teachers insight into real conceptual understanding rather than surface-level engagement.

## Key Features

### 1. Learning Evidence Trail (LET)
A cognitive analytics dashboard that tracks the evidence of learning rather than simple completion.
- Concept Clarity Trend (High / Medium / Low)
- Observation Accuracy
- Focus vs. Distraction Tracking
- Doubt Resolution Flow
- Timeline of learning progression

### 2. Vision Lab (Computer Vision Learning Workspace)
An interactive environment for learning computer vision concepts visually.
- Upload or study diagrams and images
- Layer-by-layer AI explanations
- Image-specific MCQs
- Final interpretation of what the model detects in the image

### 3. Focus Tracking System (Anti-Skip Visual Engagement Detection)
Tracks sustained attention during learning sessions.
- Detects prolonged distraction
- Logs focus minutes and distraction minutes
- Suggests breaks when fatigue increases
- Optional user-controlled break timer

### 4. Smart Course Progression (Rule of 3)
Ensures mastery before advancement.
- Sequential video unlocking
- Mandatory quiz after every 3 videos
- AI-generated quizzes using Groq API
- Alternate explanations if quiz fails

### 5. Intelligent Exam Study Scheduler
Personalized exam preparation based on LET.
- Phase 1: Deep Learning (weak topics)
- Phase 2: Review & Practice
- Phase 3: Final Revision
- Auto-prioritized using learning evidence
- Checkbox-based tracking

### 6. AI Tutor (Context-Aware Chatbot)
- Answers using course PDFs and video topics
- Powered by Groq + ChromaDB
- Fallback local models for development

### 7. Course & Content Management
- Create courses
- Upload videos
- Upload PDF/TXT materials
- Secure video streaming
- OCR for scanned documents

### 8. Doubt Resolution & Live Sessions
- Student doubt portal
- Teacher reply dashboard
- Weekly live doubt-clearing sessions
- Pending-doubt reminders

### 9. Role-Based Access Control
- Student dashboard
- Teacher dashboard
- Enrollment approval workflow

### 10. Teacher Analytics Dashboard
- View LET reports
- View individual student trajectories

## Tech Stack

### Backend
- FastAPI
- SQLAlchemy (Async)
- SQLite (Local) / PostgreSQL (Production)
- ChromaDB
- PyTorch / Torchvision
- Groq API
- PyPDF2, Pillow

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion
- Recharts
- Axios

## Project Structure

```bash
course-twin/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/
│   │   ├── core/
│   │   ├── models/
│   │   └── schemas/
│   ├── reset_database.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/student/let/
│   │   ├── app/student/vision-lab/
│   │   ├── app/student/exam-scheduler/
│   │   └── app/teacher/
└── README.md
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python reset_database.py
uvicorn app.main:app --reload --port 8001
```

Docs: http://localhost:8001/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Default Accounts

### Teacher
- **Email**: teacher@example.com
- **Password**: teacher123

### Student
- **Email**: student@example.com
- **Password**: student123

## Role-Based Access

### Student
- Watch videos
- Use Vision Lab
- Take quizzes
- View LET dashboard
- Ask doubts
- Use exam scheduler

### Teacher
- Create courses
- Upload videos & PDFs
- View LET analytics
- Reply to doubts
- Schedule sessions