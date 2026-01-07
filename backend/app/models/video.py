from sqlalchemy import Column, Integer, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)  # Topic description for AI quiz generation
    url = Column(String) # Path to local file or URL
    course_id = Column(Integer, ForeignKey("courses.id"))
    order_index = Column(Integer) # For ordering videos in a course

    course = relationship("app.models.course.Course", back_populates="videos")

