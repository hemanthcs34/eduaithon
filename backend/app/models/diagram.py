from sqlalchemy import Column, Integer, String, ForeignKey, Text, Float, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class DiagramSubmission(Base):
    """
    Stores student CNN diagram submissions and AI feedback.
    Part of the Diagram Intelligence Tutor feature (Module 4 - CNNs).
    """
    __tablename__ = "diagram_submissions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    image_path = Column(String, nullable=False)  # Path to uploaded diagram image
    extracted_structure = Column(JSON, nullable=True)  # AI-detected layers: {"layers": ["Conv", "ReLU", ...]}
    ai_feedback = Column(Text, nullable=True)  # Educational feedback from vision model
    correctness_score = Column(Float, nullable=True)  # 0.0 to 1.0 score
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    course = relationship("Course")
