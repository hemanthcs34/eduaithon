from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from app.models.evidence import EvidenceType

# Evidence logging schemas
class EvidenceCreate(BaseModel):
    course_id: Optional[int] = None
    type: EvidenceType
    summary: str
    concept_clarity: Optional[str] = None  # "low", "medium", "high"
    observation_accuracy: Optional[float] = None  # 0.0 to 1.0
    focus_minutes: Optional[float] = None
    distraction_minutes: Optional[float] = None
    details: Optional[str] = None  # JSON string

class EvidenceResponse(BaseModel):
    id: int
    user_id: int
    course_id: Optional[int]
    type: EvidenceType
    summary: str
    concept_clarity: Optional[str]
    observation_accuracy: Optional[float]
    focus_minutes: Optional[float]
    distraction_minutes: Optional[float]
    details: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Dashboard data structures
class TimelineEntry(BaseModel):
    timestamp: datetime
    summary: str
    type: EvidenceType

class GraphDataPoint(BaseModel):
    date: str  # ISO format
    value: float
    label: Optional[str] = None

class ConceptClarityTrend(BaseModel):
    dates: List[str]
    clarity_levels: List[str]  # "low", "medium", "high"

class ObservationAccuracyTrend(BaseModel):
    dates: List[str]
    accuracy_scores: List[float]  # 0.0 to 1.0

class FocusDistractionTrend(BaseModel):
    dates: List[str]
    focus_minutes: List[float]
    distraction_minutes: List[float]

class DoubtResolutionFlow(BaseModel):
    total_doubts: int
    resolved_doubts: int
    pending_doubts: int

class StudentLETDashboard(BaseModel):
    timeline: List[TimelineEntry]
    concept_clarity_trend: ConceptClarityTrend
    observation_accuracy_trend: ObservationAccuracyTrend
    focus_distraction_trend: FocusDistractionTrend
    doubt_resolution: DoubtResolutionFlow

class StudentLETSummary(BaseModel):
    user_id: int
    full_name: str
    usn: Optional[str]
    academic_year: Optional[str]
    branch: Optional[str]
    learning_trend: str  # "Improving", "Stable", "Inconsistent"
    pending_doubts: int
    attention_pattern: str  # "Stable", "Fatigue signs"

class TeacherLETOverview(BaseModel):
    students: List[StudentLETSummary]
