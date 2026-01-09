from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import select
from app import models, schemas
from app.api import deps
from app.core import security
from app.models.user import UserRole
from app.models.course import EnrollmentStatus

router = APIRouter()

@router.post("/", response_model=schemas.User)
async def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
) -> Any:
    """
    Create new user.
    """
    result = await db.execute(select(models.User).where(models.User.email == user_in.email))
    user = result.scalar_one_or_none()
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user = models.User(
        email=user_in.email,
        hashed_password=security.get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.STUDENT, # Public signup is restricted to Students
        is_active=True,
        # Academic identity (Always required for students)
        usn=user_in.usn,
        academic_year=user_in.academic_year,
        branch=user_in.branch,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.get("/me", response_model=schemas.User)
async def read_user_me(
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get current user.
    """
    return current_user

# Enrollment Endpoints

@router.post("/enroll", response_model=schemas.EnrollmentInDB)
async def request_enrollment(
    *,
    db: Session = Depends(deps.get_db),
    enrollment_in: schemas.EnrollmentCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Student requests enrollment in a course.
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=400, detail="Only students can enroll")
    
    # Check if already enrolled
    result = await db.execute(
        select(models.Enrollment).where(
            models.Enrollment.student_id == current_user.id,
            models.Enrollment.course_id == enrollment_in.course_id
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
         raise HTTPException(status_code=400, detail="Already enrolled or pending")

    enrollment = models.Enrollment(
        student_id=current_user.id,
        course_id=enrollment_in.course_id,
        status=EnrollmentStatus.PENDING
    )
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment

@router.get("/enrollments/pending")
async def get_pending_enrollments(
    *,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get pending enrollment requests for teacher's courses.
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can view pending enrollments")
    
    # Get teacher's courses
    courses_result = await db.execute(
        select(models.Course).where(models.Course.teacher_id == current_user.id)
    )
    teacher_courses = courses_result.scalars().all()
    course_ids = [c.id for c in teacher_courses]
    
    if not course_ids:
        return []
    
    # Get pending enrollments for those courses
    result = await db.execute(
        select(models.Enrollment)
        .options(selectinload(models.Enrollment.student), selectinload(models.Enrollment.course))
        .where(
            models.Enrollment.course_id.in_(course_ids),
            models.Enrollment.status == EnrollmentStatus.PENDING
        )
    )
    enrollments = result.scalars().all()
    
    # Build response
    response = []
    for e in enrollments:
        response.append({
            "id": e.id,
            "course_id": e.course_id,
            "course_title": e.course.title if e.course else "Unknown",
            "student_id": e.student_id,
            "student_name": e.student.full_name if e.student else "Unknown",
            "student_email": e.student.email if e.student else "",
            "student_usn": e.student.usn if e.student else None,
            "student_academic_year": e.student.academic_year.value if e.student and e.student.academic_year else None,
            "student_branch": e.student.branch if e.student else None,
            "status": e.status.value,
            "created_at": e.created_at
        })
    return response

@router.put("/enroll/{enrollment_id}", response_model=schemas.EnrollmentInDB)
async def update_enrollment(
    *,
    db: Session = Depends(deps.get_db),
    enrollment_id: int,
    status_update: schemas.EnrollmentUpdate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Teacher approves/rejects enrollment.
    """
    if current_user.role != UserRole.TEACHER:
         raise HTTPException(status_code=403, detail="Only teachers can approve enrollments")
    
    result = await db.execute(
        select(models.Enrollment)
        .options(selectinload(models.Enrollment.course))
        .where(models.Enrollment.id == enrollment_id)
    )
    enrollment = result.scalar_one_or_none()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Check if course belongs to this teacher
    if enrollment.course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")
        
    enrollment.status = status_update.status
    db.add(enrollment)
    await db.commit()
    await db.refresh(enrollment)
    return enrollment
