from .token import Token, TokenPayload
from .user import User, UserCreate, UserUpdate
from .course import Course, CourseCreate, Video, VideoCreate, CourseWithTeacher, TeacherInfo
from .enrollment import EnrollmentInDB, EnrollmentCreate, EnrollmentUpdate
from .progress import VideoProgress, VideoProgressCreate, VideoProgressUpdate
from .material import CourseMaterial, CourseMaterialCreate

# Alias for convenience
Enrollment = EnrollmentInDB
