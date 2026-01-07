from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None  # Topic description for AI quiz generation
    order_index: int
    url: Optional[str] = None

class VideoCreate(VideoBase):
    pass

class Video(VideoBase):
    id: int
    course_id: int
    
    class Config:
        from_attributes = True

class TeacherInfo(BaseModel):
    id: int
    full_name: str
    email: str
    
    class Config:
        from_attributes = True

class CourseBase(BaseModel):
    title: str
    description: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class Course(CourseBase):
    id: int
    teacher_id: int
    created_at: datetime
    videos: List[Video] = []

    class Config:
        from_attributes = True

class CourseWithTeacher(Course):
    teacher: Optional[TeacherInfo] = None
    is_enrolled: bool = False
    enrollment_status: Optional[str] = None
