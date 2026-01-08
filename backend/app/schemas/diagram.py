from typing import Optional, List, Any
from pydantic import BaseModel
from datetime import datetime


class DiagramSubmissionCreate(BaseModel):
    """Schema for creating a new diagram submission (used internally)."""
    course_id: int


class DetectedLayer(BaseModel):
    """A single detected CNN layer."""
    name: str  # e.g., "Conv2D", "ReLU", "MaxPool", "FC", "Softmax"
    order: int
    valid: bool = True
    issue: Optional[str] = None


class DiagramAnalysisResult(BaseModel):
    """Result from the AI vision analysis."""
    layers: List[DetectedLayer] = []
    flow_valid: bool = True
    overall_feedback: str = ""
    correctness_score: float = 0.0
    suggestions: List[str] = []


class DiagramSubmissionResponse(BaseModel):
    """Full response for a diagram submission."""
    id: int
    user_id: int
    course_id: int
    image_path: str
    extracted_structure: Optional[Any] = None
    ai_feedback: Optional[str] = None
    correctness_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiagramSubmissionListItem(BaseModel):
    """Simplified response for listing submissions."""
    id: int
    course_id: int
    correctness_score: Optional[float] = None
    created_at: datetime

    class Config:
        from_attributes = True
