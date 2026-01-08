from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class EvidenceType(str, enum.Enum):
    VISION_MCQ = "vision_mcq"
    DOUBT_RAISED = "doubt_raised"
    DOUBT_RESOLVED = "doubt_resolved"
    DISTRACTION = "distraction"
    FOCUS_SESSION = "focus_session"
    DIAGRAM_ANALYSIS = "diagram_analysis"

class LearningEvidence(Base):
    __tablename__ = "learning_evidence"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True, index=True)
    
    # Evidence metadata
    type = Column(Enum(EvidenceType), nullable=False, index=True)
    summary = Column(Text, nullable=False)  # Human-readable timeline entry
    
    # Signals for graphs (nullable based on type)
    concept_clarity = Column(String, nullable=True)  # "low", "medium", "high"
    observation_accuracy = Column(Float, nullable=True)  # 0.0 to 1.0
    focus_minutes = Column(Float, nullable=True)
    distraction_minutes = Column(Float, nullable=True)
    
    # Additional context (JSON for flexibility)
    details = Column(Text, nullable=True)  # JSON string for extra data
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationships
    user = relationship("User", backref="learning_evidence")
    course = relationship("Course", backref="learning_evidence")
