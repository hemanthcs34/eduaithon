from typing import List, Optional
from pydantic import BaseModel, Field, validator
from datetime import date


class TopicInput(BaseModel):
    """Input for a single exam topic"""
    topic_name: str = Field(..., min_length=1, max_length=200)
    importance_level: Optional[str] = Field(None, pattern="^(high|medium|low)$")
    marks: Optional[int] = Field(None, ge=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "topic_name": "Data Structures",
                "importance_level": "high",
                "marks": 25
            }
        }


class ExamScheduleCreate(BaseModel):
    """Request to generate an exam study schedule"""
    exam_date: date
    daily_hours: float = Field(..., ge=1, le=12)
    topics: List[TopicInput] = Field(..., min_length=1)
    
    @validator('exam_date')
    def exam_date_must_be_future(cls, v):
        from datetime import date as date_type
        if v <= date_type.today():
            raise ValueError('Exam date must be in the future')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "exam_date": "2026-01-20",
                "daily_hours": 4,
                "topics": [
                    {"topic_name": "Data Structures", "importance_level": "high"},
                    {"topic_name": "Algorithms", "importance_level": "medium"},
                    {"topic_name": "DBMS"}
                ]
            }
        }


class StudyTask(BaseModel):
    """A single study task in the schedule"""
    topic: str
    activity_type: str  # New field: "Concept Learning", "Revision", "Practice", "Mock Test"
    duration_hours: float
    priority_score: float
    importance_level: str
    is_inferred: bool
    rationale: str


class DaySchedule(BaseModel):
    """Schedule for a single day"""
    date: str  # ISO format
    phase: str # New field: "Learning Phase", "Review Phase", "Final Prep"
    tasks: List[StudyTask]
    total_hours: float


class ScheduleResponse(BaseModel):
    """Generated study schedule"""
    days: List[DaySchedule]
    total_study_hours: float
    days_until_exam: int
    topics_covered: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "days": [
                    {
                        "date": "2026-01-10",
                        "tasks": [
                            {
                                "topic": "Data Structures",
                                "duration_hours": 2.5,
                                "priority_score": 4.8,
                                "importance_level": "high",
                                "is_inferred": False,
                                "rationale": "High importance set by you + low understanding from LET"
                            }
                        ],
                        "total_hours": 2.5
                    }
                ],
                "total_study_hours": 20,
                "days_until_exam": 10,
                "topics_covered": 3
            }
        }


class ExamScheduleResponse(BaseModel):
    """Saved schedule with metadata"""
    id: int
    exam_date: date
    daily_hours: float
    schedule: ScheduleResponse
    created_at: str
    
    class Config:
        from_attributes = True
