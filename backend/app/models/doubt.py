from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class DoubtStatus(str, enum.Enum):
    PENDING = "pending"
    ANSWERED = "answered"

class Doubt(Base):
    __tablename__ = "doubts"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    question_text = Column(Text, nullable=False)
    teacher_reply = Column(Text, nullable=True)
    status = Column(Enum(DoubtStatus), default=DoubtStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    student = relationship("User", backref="doubts_asked")
    course = relationship("Course", backref="course_doubts")

class DoubtSession(Base):
    __tablename__ = "doubt_sessions"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_date = Column(DateTime(timezone=True), nullable=False)
    meeting_link = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    course = relationship("Course", backref="doubt_sessions")
    teacher = relationship("User", backref="sessions_hosted")
