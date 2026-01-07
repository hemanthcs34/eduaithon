from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class CourseMaterial(Base):
    __tablename__ = "course_materials"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String, nullable=False)
    file_path = Column(String, nullable=False)  # Path to uploaded file
    file_type = Column(String, nullable=False)  # pdf, txt, md, docx
    content_text = Column(Text, nullable=True)  # Extracted text content
    chromadb_collection = Column(String, nullable=True)  # ChromaDB collection name
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    course = relationship("Course", back_populates="materials")
