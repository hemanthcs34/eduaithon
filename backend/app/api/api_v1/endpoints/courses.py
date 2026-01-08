from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app import models, schemas
from app.api import deps
from app.models.user import UserRole
from app.models.course import EnrollmentStatus
import shutil
import os

router = APIRouter()

@router.post("/", response_model=schemas.Course)
async def create_course(
    *,
    db: Session = Depends(deps.get_db),
    course_in: schemas.CourseCreate,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new course (Teacher only).
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    course = models.Course(
        title=course_in.title,
        description=course_in.description,
        teacher_id=current_user.id
    )
    db.add(course)
    await db.flush()
    course_id = course.id
    await db.commit()
    
    result = await db.execute(
        select(models.Course)
        .options(selectinload(models.Course.videos))
        .where(models.Course.id == course_id)
    )
    return result.scalar_one()

@router.get("/", response_model=List[schemas.Course])
async def read_courses(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve courses.
    """
    result = await db.execute(
        select(models.Course)
        .options(selectinload(models.Course.videos))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/browse", response_model=List[schemas.CourseWithTeacher])
async def browse_courses(
    db: Session = Depends(deps.get_db),
    current_user: Optional[models.User] = Depends(deps.get_current_active_user),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Browse courses with teacher info and enrollment status for students.
    """
    result = await db.execute(
        select(models.Course)
        .options(
            selectinload(models.Course.videos),
            selectinload(models.Course.teacher)
        )
        .offset(skip)
        .limit(limit)
    )
    courses = result.scalars().all()
    
    # Get student's enrollments if logged in as student
    enrollments_map = {}
    if current_user and current_user.role == UserRole.STUDENT:
        enroll_result = await db.execute(
            select(models.Enrollment).where(models.Enrollment.student_id == current_user.id)
        )
        for enrollment in enroll_result.scalars().all():
            enrollments_map[enrollment.course_id] = enrollment.status.value
    
    # Build response with teacher info and enrollment status
    response = []
    for course in courses:
        course_dict = {
            "id": course.id,
            "title": course.title,
            "description": course.description,
            "teacher_id": course.teacher_id,
            "created_at": course.created_at,
            "videos": course.videos,
            "teacher": {
                "id": course.teacher.id,
                "full_name": course.teacher.full_name,
                "email": course.teacher.email
            } if course.teacher else None,
            "is_enrolled": course.id in enrollments_map and enrollments_map[course.id] == "approved",
            "enrollment_status": enrollments_map.get(course.id)
        }
        response.append(course_dict)
    
    return response

@router.get("/{course_id}", response_model=schemas.Course)
async def get_course(
    *,
    db: Session = Depends(deps.get_db),
    course_id: int,
) -> Any:
    """
    Get a specific course by ID.
    """
    result = await db.execute(
        select(models.Course)
        .options(selectinload(models.Course.videos))
        .where(models.Course.id == course_id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@router.post("/{course_id}/videos", response_model=schemas.Video)
async def upload_video(
    *,
    db: Session = Depends(deps.get_db),
    course_id: int,
    title: Optional[str] = None,
    description: Optional[str] = "",
    order_index: Optional[int] = None,
    primary_video_id: Optional[int] = None,
    file: Optional[UploadFile] = File(None),
    alternate_file: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Upload video(s) to a course.
    Supports:
    1. New Primary Video (+ optional Alternate)
    2. Fallback Alternate Video (for existing Primary)
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    upload_dir = f"uploads/courses/{course_id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Scenerio 2: Fallback Alternate Upload (primary_video_id provided)
    if primary_video_id:
        if not alternate_file:
             raise HTTPException(status_code=400, detail="alternate_file required when adding to existing primary video")
        
        # Verify primary exists
        p_res = await db.execute(select(models.Video).where(models.Video.id == primary_video_id, models.Video.course_id == course_id))
        primary_video = p_res.scalar_one_or_none()
        if not primary_video:
             raise HTTPException(status_code=404, detail="Primary video not found")
        if primary_video.primary_video_id is not None:
             raise HTTPException(status_code=400, detail="Cannot add alternate to an alternate video")

        # Check if alternate already exists
        alt_res = await db.execute(select(models.Video).where(models.Video.primary_video_id == primary_video_id))
        if alt_res.scalar_one_or_none():
             raise HTTPException(status_code=400, detail="Primary video already has an alternate")

        # Create Alternate Video
        alt_filename = f"ALT_{alternate_file.filename}"
        alt_location = f"{upload_dir}/{alt_filename}"
        with open(alt_location, "wb+") as buffer:
             shutil.copyfileobj(alternate_file.file, buffer)
        
        alt_video = models.Video(
            title=primary_video.title, # Inherit title
            description=primary_video.description, # Inherit description
            course_id=course_id,
            order_index=primary_video.order_index,
            url=alt_location,
            primary_video_id=primary_video_id
        )
        db.add(alt_video)
        await db.commit()
        await db.refresh(alt_video)
        return alt_video

    # Scenario 1: New Primary Video (+ Optional Alternate)
    if not file or not title or order_index is None:
        raise HTTPException(status_code=400, detail="file, title, and order_index required for new video")

    file_location = f"{upload_dir}/{file.filename}"
    with open(file_location, "wb+") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    video = models.Video(
        title=title,
        description=description,
        course_id=course_id,
        order_index=order_index,
        url=file_location
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    # Handle Simultaneous Alternate Upload
    if alternate_file:
        alt_filename = f"ALT_{alternate_file.filename}"
        alt_location = f"{upload_dir}/{alt_filename}"
        with open(alt_location, "wb+") as buffer:
             shutil.copyfileobj(alternate_file.file, buffer)
        
        alt_video = models.Video(
            title=title,
            description=description,
            course_id=course_id,
            order_index=order_index,
            url=alt_location,
            primary_video_id=video.id
        )
        db.add(alt_video)
        await db.commit()

    return video

@router.delete("/{course_id}/videos/{video_id}")
async def delete_video(
    *,
    db: Session = Depends(deps.get_db),
    course_id: int,
    video_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a video from a course.
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get video
    result = await db.execute(
        select(models.Video).where(
            models.Video.id == video_id,
            models.Video.course_id == course_id
        )
    )
    video = result.scalar_one_or_none()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Verify course ownership
    course_result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    
    # Try to delete file (may fail if in use - that's ok)
    file_deleted = False
    if os.path.exists(video.url):
        try:
            os.remove(video.url)
            file_deleted = True
        except PermissionError:
            # File is in use (being streamed), will be orphaned
            pass
        except Exception:
            pass
    
    # Delete progress entries for this video
    from sqlalchemy import delete
    await db.execute(
        delete(models.VideoProgress).where(
            models.VideoProgress.video_id == video_id
        )
    )
    
    # Delete video record
    await db.delete(video)
    await db.commit()
    
    return {"status": "deleted", "video_id": video_id, "file_deleted": file_deleted}

@router.delete("/{course_id}")
async def delete_course(
    *,
    db: Session = Depends(deps.get_db),
    course_id: int,
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete a course and ALL its related data (videos, materials, quizzes, enrollments, progress).
    Only the course owner (teacher) can delete.
    """
    from sqlalchemy import delete
    
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify course exists and belongs to teacher
    result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    
    # Get all videos for this course (needed for progress deletion and file cleanup)
    videos_result = await db.execute(select(models.Video).where(models.Video.course_id == course_id))
    videos = videos_result.scalars().all()
    video_ids = [v.id for v in videos]
    
    # Get all quizzes for this course (needed for quiz attempt deletion)
    quizzes_result = await db.execute(select(models.Quiz).where(models.Quiz.course_id == course_id))
    quizzes = quizzes_result.scalars().all()
    quiz_ids = [q.id for q in quizzes]
    
    # Delete in correct order to respect foreign key constraints
    
    # 1. Delete quiz attempts
    if quiz_ids:
        await db.execute(delete(models.QuizAttempt).where(models.QuizAttempt.quiz_id.in_(quiz_ids)))
    
    # 2. Delete quizzes
    await db.execute(delete(models.Quiz).where(models.Quiz.course_id == course_id))
    
    # 3. Delete video progress
    if video_ids:
        await db.execute(delete(models.VideoProgress).where(models.VideoProgress.video_id.in_(video_ids)))
    
    # 4. Delete videos (and their files)
    for video in videos:
        if os.path.exists(video.url):
            try:
                os.remove(video.url)
            except Exception:
                pass
    await db.execute(delete(models.Video).where(models.Video.course_id == course_id))
    
    # 5. Delete materials (and their files)
    materials_result = await db.execute(select(models.CourseMaterial).where(models.CourseMaterial.course_id == course_id))
    materials = materials_result.scalars().all()
    for material in materials:
        if os.path.exists(material.file_path):
            try:
                os.remove(material.file_path)
            except Exception:
                pass
    await db.execute(delete(models.CourseMaterial).where(models.CourseMaterial.course_id == course_id))
    
    # 6. Delete enrollments
    await db.execute(delete(models.Enrollment).where(models.Enrollment.course_id == course_id))
    
    # 7. Delete the course itself
    await db.delete(course)
    await db.commit()
    
    # Try to remove the course upload directory
    upload_dir = f"uploads/courses/{course_id}"
    if os.path.exists(upload_dir):
        try:
            shutil.rmtree(upload_dir)
        except Exception:
            pass
    
    return {"status": "deleted", "course_id": course_id}
