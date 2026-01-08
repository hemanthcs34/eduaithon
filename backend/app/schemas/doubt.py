from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.doubt import DoubtStatus

# --- Doubt Schemas ---

class DoubtBase(BaseModel):
    question_text: str

class DoubtCreate(DoubtBase):
    course_id: int

class DoubtUpdate(BaseModel):
    teacher_reply: str
    status: DoubtStatus = DoubtStatus.ANSWERED

class DoubtResponse(DoubtBase):
    id: int
    student_id: int
    course_id: int
    teacher_reply: Optional[str] = None
    status: DoubtStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # We might want to show student name in teacher view
    # But for now, let's keep it simple or add student_name if needed
    student_name: Optional[str] = None

    class Config:
        from_attributes = True

# --- Session Schemas ---

class SessionBase(BaseModel):
    session_date: datetime
    meeting_link: str  # Required field

class SessionCreate(SessionBase):
    course_id: int

class SessionResponse(SessionBase):
    id: int
    course_id: int
    teacher_id: int
    created_at: datetime

    class Config:
        from_attributes = True
