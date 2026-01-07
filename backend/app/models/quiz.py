from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    trigger_video_index = Column(Integer, nullable=False)  # Quiz appears after this video (3, 6, 9, etc.)
    questions = Column(JSON, nullable=False)  # Stored as JSON array
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    course = relationship("Course")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    answers = Column(JSON, nullable=True)  # User's answers
    score = Column(Float, nullable=True)  # Percentage score
    passed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")
    quiz = relationship("Quiz")
