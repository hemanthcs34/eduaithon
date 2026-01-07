from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class VideoProgress(Base):
    __tablename__ = "video_progress"
    __table_args__ = (
        UniqueConstraint('user_id', 'video_id', name='uq_user_video_progress'),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    watched_seconds = Column(Float, default=0.0)  # Current progress in seconds
    total_seconds = Column(Float, default=0.0)    # Total video duration
    max_watched_seconds = Column(Float, default=0.0)  # Maximum position reached (can't seek past this)
    completed = Column(Boolean, default=False)
    last_updated = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    video = relationship("Video")

