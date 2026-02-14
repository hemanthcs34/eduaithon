
# 🚀 Local API Endpoints

Base URL: `http://localhost:8001/api/v1`

## 🔐 Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login/access-token` | Obtain access token |
| POST | `/login/test-token` | Test access token |

## 👤 Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/` | Create new user (Signup) |
| GET | `/users/me` | Get current user details |
| POST | `/users/enroll` | Enroll in a course |
| GET | `/users/enrollments/pending` | Get pending enrollments |
| PUT | `/users/enroll/{enrollment_id}` | Approve/Reject enrollment |

## 📚 Courses & Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/courses/` | Create a new course |
| GET | `/courses/` | List all courses |
| GET | `/courses/browse` | Browse courses with teacher info |
| GET | `/courses/{course_id}` | Get specific course details |
| DELETE | `/courses/{course_id}` | Delete a course |
| POST | `/courses/{course_id}/videos` | Upload a video |
| DELETE | `/courses/{course_id}/videos/{video_id}` | Delete a video |
| POST | `/courses/{course_id}/materials` | Upload material |
| GET | `/courses/{course_id}/materials` | List materials |
| DELETE | `/courses/{course_id}/materials/{material_id}` | Delete material |
| GET | `/courses/{course_id}/materials/{material_id}/download` | Download material |

## 🎥 Videos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/videos/{video_id}/stream` | Stream video content |
| GET | `/videos/{video_id}/progress` | Get video progress |
| POST | `/videos/{video_id}/progress` | Update video progress |
| GET | `/videos/course/{course_id}/progress` | Get course progress |

## 💬 Chat (AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/` | Send message to AI assistant |

## 📝 Quiz
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/quiz/course/{course_id}/check` | Check if quiz exists |
| POST | `/quiz/course/{course_id}/generate` | Generate quiz |
| POST | `/quiz/submit` | Submit quiz answers |
| GET | `/quiz/course/{course_id}/status` | Get quiz results |

## 🎨 Diagram Tutor
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/diagram-tutor/submit` | Submit diagram |
| GET | `/diagram-tutor/course/{course_id}/submissions` | List submissions |
| GET | `/diagram-tutor/submission/{submission_id}` | Get submission details |
| GET | `/diagram-tutor/submission/{submission_id}/image` | Get submission image |

## 👁️ Vision Lab
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/vision-lab/explore` | Analyze image |

## ❓ Doubts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/doubts/` | Post a doubt |
| GET | `/doubts/course/{course_id}` | List doubts |
| PUT | `/doubts/{doubt_id}/reply` | Reply to doubt |
| POST | `/doubts/session` | Create live session |
| GET | `/doubts/session/course/{course_id}` | List sessions |

## 📊 Learning Evidence (LET)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/let/log` | Log activity |
| GET | `/let/student/dashboard` | Student dashboard data |
| GET | `/let/teacher/overview` | Teacher overview data |
| GET | `/let/teacher/student/{student_id}` | Student details for teacher |

## 📅 Exam Scheduler
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/exam-scheduler/generate` | Generate schedule |
| GET | `/exam-scheduler/my-schedules` | Get schedules |

## 🛠️ MCP Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/monitor` | System health |
| POST | `/scale` | Scale service |
| POST | `/rollback` | Rollback service |
