from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class ExamSchedule(Base):
    __tablename__ = "exam_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Exam details
    exam_date = Column(Date, nullable=False)
    daily_hours = Column(Float, nullable=False)  # 1-12 hours
    
    # Topics and schedule (stored as JSON strings)
    topics = Column(Text, nullable=False)  # JSON array of topic objects
    generated_schedule = Column(Text, nullable=True)  # JSON of day-wise schedule
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", backref="exam_schedules")
