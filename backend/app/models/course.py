from sqlalchemy import Column, Integer, String, ForeignKey, Enum, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum

class EnrollmentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("app.models.user.User", back_populates="courses_teaching")
    enrollments = relationship("Enrollment", back_populates="course")
    videos = relationship("Video", back_populates="course")
    materials = relationship("CourseMaterial", back_populates="course")

class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    status = Column(Enum(EnrollmentStatus), default=EnrollmentStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("app.models.user.User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")
