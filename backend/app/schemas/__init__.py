from .token import Token, TokenPayload
from .user import User, UserCreate, UserUpdate
from .course import Course, CourseCreate, Video, VideoCreate, CourseWithTeacher, TeacherInfo
from .enrollment import EnrollmentInDB, EnrollmentCreate, EnrollmentUpdate
from .progress import VideoProgress, VideoProgressCreate, VideoProgressUpdate
from .material import CourseMaterial, CourseMaterialCreate
from .evidence import (
    EvidenceCreate, EvidenceResponse,
    StudentLETDashboard, TeacherLETOverview, StudentLETSummary,
    TimelineEntry, ConceptClarityTrend, ObservationAccuracyTrend,
    FocusDistractionTrend, DoubtResolutionFlow
)

# Alias for convenience
Enrollment = EnrollmentInDB
