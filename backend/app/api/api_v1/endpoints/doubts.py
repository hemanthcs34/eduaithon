from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app import models, schemas
from app.api import deps
from app.models.user import UserRole
from app.schemas.doubt import DoubtCreate, DoubtResponse, DoubtUpdate, SessionCreate, SessionResponse
from app.models.doubt import Doubt, DoubtSession, DoubtStatus
from datetime import datetime, timedelta

router = APIRouter()

# --- DOUBTS ---

@router.post("/", response_model=DoubtResponse)
async def create_doubt(
    doubt_in: DoubtCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create a new doubt. (Student only)
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only students can ask doubts")
    
    # Verify enrollment
    enrollment = await db.execute(
        select(models.Enrollment).where(
            models.Enrollment.student_id == current_user.id,
            models.Enrollment.course_id == doubt_in.course_id,
            models.Enrollment.status == "approved" # Assuming 'approved' string or enum
        )
    )
    if not enrollment.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="You must be enrolled in the course")

    doubt = Doubt(
        student_id=current_user.id,
        course_id=doubt_in.course_id,
        question_text=doubt_in.question_text,
        status=DoubtStatus.PENDING
    )
    db.add(doubt)
    await db.commit()
    await db.refresh(doubt)
    return doubt

@router.get("/course/{course_id}", response_model=List[DoubtResponse])
async def get_doubts(
    course_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get doubts for a course.
    - Students see ALL doubts (read-only learning).
    - Teachers see ALL doubts (to reply).
    """
    # Verify access (Student enrolled OR Teacher of course)
    course_result = await db.execute(select(models.Course).where(models.Course.id == course_id))
    course = course_result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == UserRole.STUDENT:
        # Check enrollment
        enrollment = await db.execute(
            select(models.Enrollment).where(
                models.Enrollment.student_id == current_user.id,
                models.Enrollment.course_id == course_id,
                models.Enrollment.status == "approved"
            )
        )
        if not enrollment.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Not enrolled")
            
    elif current_user.role == UserRole.TEACHER:
        if course.teacher_id != current_user.id:
             raise HTTPException(status_code=403, detail="Not your course")

    # Fetch doubts
    query = select(Doubt).where(Doubt.course_id == course_id).order_by(desc(Doubt.created_at))
    result = await db.execute(query)
    doubts = result.scalars().all()

    # Populate student_name manually for now (optimization)
    doubt_responses = []
    for d in doubts:
        # Fetch student name
        student_res = await db.execute(select(models.User).where(models.User.id == d.student_id))
        student = student_res.scalar_one_or_none()
        student_name = student.full_name if student else "Unknown"
        
        d_resp = DoubtResponse.model_validate(d)
        d_resp.student_name = student_name
        doubt_responses.append(d_resp)

    return doubt_responses

@router.put("/{doubt_id}/reply", response_model=DoubtResponse)
async def reply_doubt(
    doubt_id: int,
    reply_in: DoubtUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Reply to a doubt. (Teacher only)
    """
    doubt_res = await db.execute(select(Doubt).where(Doubt.id == doubt_id))
    doubt = doubt_res.scalar_one_or_none()
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")

    # Verify teacher owns this course
    course_res = await db.execute(select(models.Course).where(models.Course.id == doubt.course_id))
    course = course_res.scalar_one_or_none()
    
    if current_user.role != UserRole.TEACHER or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied")

    doubt.teacher_reply = reply_in.teacher_reply
    doubt.status = DoubtStatus.ANSWERED
    doubt.updated_at = datetime.now()
    
    db.add(doubt)
    await db.commit()
    await db.refresh(doubt)
    return doubt

# --- SESSIONS ---

@router.post("/session", response_model=SessionResponse)
async def schedule_session(
    session_in: SessionCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Schedule a live doubt session.
    Also returns list of currently pending doubts to help teacher plan.
    """
    if current_user.role != UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can schedule sessions")

    # Verify course ownership
    course_res = await db.execute(select(models.Course).where(models.Course.id == session_in.course_id))
    course = course_res.scalar_one_or_none()
    if not course or course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    session = DoubtSession(
        course_id=session_in.course_id,
        teacher_id=current_user.id,
        session_date=session_in.session_date,
        meeting_link=session_in.meeting_link
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # Calculate pending doubts for "Simulated Reminder"
    pending_res = await db.execute(
        select(Doubt).where(
            Doubt.course_id == session_in.course_id,
            Doubt.status == DoubtStatus.PENDING
        )
    )
    pending_count = len(pending_res.scalars().all())
    
    # Simulate Log
    print(f"[REMINDER SYSTEM] Scheduled Session for Course {session_in.course_id}. Pending Doubts to cover: {pending_count}")

    return session

@router.get("/session/course/{course_id}", response_model=List[SessionResponse])
async def get_sessions(
    course_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get upcoming sessions for a course.
    """
    # Simple check: session_date >= now - 1 hour (show slightly past sessions too)
    cutoff = datetime.now() - timedelta(hours=1)
    
    query = select(DoubtSession).where(
        DoubtSession.course_id == course_id,
        DoubtSession.session_date >= cutoff
    ).order_by(DoubtSession.session_date)
    
    result = await db.execute(query)
    return result.scalars().all()
