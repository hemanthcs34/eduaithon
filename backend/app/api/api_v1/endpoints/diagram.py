"""
Diagram Intelligence Tutor API Endpoints.

Allows students to submit CNN architecture diagrams and receive AI-powered feedback.
Part of Module 4 - Deep Learning for Computer Vision (CNNs).
"""
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from app import models
from app.api import deps
from app.models.user import UserRole
from app.core.vision import analyze_cnn_diagram
from app.schemas.diagram import DiagramSubmissionResponse, DiagramSubmissionListItem
import os
import shutil

router = APIRouter()

UPLOAD_DIR = "uploads/diagrams"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}


def validate_image_file(filename: str) -> bool:
    """Check if file has allowed image extension."""
    if not filename:
        return False
    ext = filename.rsplit(".", 1)[-1].lower()
    return ext in ALLOWED_EXTENSIONS


@router.post("/submit", response_model=DiagramSubmissionResponse)
async def submit_diagram(
    course_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Submit a CNN diagram for AI analysis.
    
    Students upload an image of their CNN architecture diagram.
    The AI Vision model analyzes the diagram and provides:
    - Detected layer types (Conv, ReLU, Pool, FC, Softmax)
    - Flow validation (correct layer ordering)
    - Educational feedback with explanations
    - Correctness score (0.0 to 1.0)
    
    Requires: Student or Teacher role + enrollment in course (for students).
    """
    # Validate file type
    if not validate_image_file(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Verify course exists
    course_result = await db.execute(
        select(models.Course).where(models.Course.id == course_id)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # For students, verify enrollment
    if current_user.role == UserRole.STUDENT:
        enrollment_result = await db.execute(
            select(models.Enrollment).where(
                models.Enrollment.student_id == current_user.id,
                models.Enrollment.course_id == course_id,
                models.Enrollment.status == models.course.EnrollmentStatus.APPROVED
            )
        )
        if not enrollment_result.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="You must be enrolled in this course to submit diagrams"
            )
    
    # Save uploaded file
    course_dir = os.path.join(UPLOAD_DIR, str(course_id))
    os.makedirs(course_dir, exist_ok=True)
    
    # Use unique filename to avoid conflicts
    import uuid
    file_ext = file.filename.rsplit(".", 1)[-1].lower()
    unique_filename = f"{current_user.id}_{uuid.uuid4().hex[:8]}.{file_ext}"
    file_path = os.path.join(course_dir, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Analyze diagram with AI Vision
    analysis_result = await analyze_cnn_diagram(file_path)
    
    if "error" in analysis_result:
        # Still save the submission but with error feedback
        submission = models.DiagramSubmission(
            user_id=current_user.id,
            course_id=course_id,
            image_path=file_path,
            extracted_structure=None,
            ai_feedback=f"Analysis failed: {analysis_result['error']}",
            correctness_score=None
        )
    else:
        # Successful analysis
        submission = models.DiagramSubmission(
            user_id=current_user.id,
            course_id=course_id,
            image_path=file_path,
            extracted_structure={
                "layers": analysis_result.get("layers", []),
                "flow_valid": analysis_result.get("flow_valid", False),
                "suggestions": analysis_result.get("suggestions", []),
                "correction_steps": analysis_result.get("correction_steps", [])
            },
            ai_feedback=analysis_result.get("overall_feedback", ""),
            correctness_score=analysis_result.get("correctness_score")
        )
    
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    
    return submission


@router.get("/course/{course_id}/submissions", response_model=List[DiagramSubmissionResponse])
async def get_course_submissions(
    course_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get diagram submissions for a course.
    
    - Students see only their own submissions.
    - Teachers see all submissions for courses they teach.
    """
    # Verify course exists
    course_result = await db.execute(
        select(models.Course).where(models.Course.id == course_id)
    )
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Build query based on role
    if current_user.role == UserRole.TEACHER:
        # Teachers can see all submissions for their courses
        if course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your course")
        
        result = await db.execute(
            select(models.DiagramSubmission)
            .where(models.DiagramSubmission.course_id == course_id)
            .order_by(models.DiagramSubmission.created_at.desc())
        )
    else:
        # Students see only their own
        result = await db.execute(
            select(models.DiagramSubmission)
            .where(
                models.DiagramSubmission.course_id == course_id,
                models.DiagramSubmission.user_id == current_user.id
            )
            .order_by(models.DiagramSubmission.created_at.desc())
        )
    
    return result.scalars().all()


@router.get("/submission/{submission_id}", response_model=DiagramSubmissionResponse)
async def get_submission_detail(
    submission_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get details of a specific diagram submission.
    
    Students can only view their own submissions.
    Teachers can view any submission in their courses.
    """
    result = await db.execute(
        select(models.DiagramSubmission)
        .where(models.DiagramSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Authorization check
    if current_user.role == UserRole.STUDENT:
        if submission.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your submission")
    else:
        # Teacher - verify they own the course
        course_result = await db.execute(
            select(models.Course).where(models.Course.id == submission.course_id)
        )
        course = course_result.scalar_one_or_none()
        if not course or course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your course")
    
    return submission


@router.get("/submission/{submission_id}/image")
async def get_submission_image(
    submission_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> FileResponse:
    """
    Get the diagram image for a specific submission.
    
    Students can only view their own submission images.
    Teachers can view any submission image in their courses.
    """
    result = await db.execute(
        select(models.DiagramSubmission)
        .where(models.DiagramSubmission.id == submission_id)
    )
    submission = result.scalar_one_or_none()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Authorization check
    if current_user.role == UserRole.STUDENT:
        if submission.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your submission")
    else:
        # Teacher - verify they own the course
        course_result = await db.execute(
            select(models.Course).where(models.Course.id == submission.course_id)
        )
        course = course_result.scalar_one_or_none()
        if not course or course.teacher_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your course")
    
    # Check if file exists
    if not os.path.exists(submission.image_path):
        raise HTTPException(status_code=404, detail="Image file not found")
    
    # Determine media type
    ext = submission.image_path.rsplit(".", 1)[-1].lower()
    media_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp"
    }
    media_type = media_types.get(ext, "image/png")
    
    return FileResponse(submission.image_path, media_type=media_type)
