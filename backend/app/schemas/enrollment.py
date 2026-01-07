from typing import Optional
from pydantic import BaseModel
from app.models.course import EnrollmentStatus
from datetime import datetime

class EnrollmentBase(BaseModel):
    course_id: int

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentUpdate(BaseModel):
    status: EnrollmentStatus

class EnrollmentInDB(EnrollmentBase):
    id: int
    student_id: int
    status: EnrollmentStatus
    created_at: datetime

    class Config:
        from_attributes = True
