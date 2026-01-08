"""
Learning Evidence Trail (LET) API Endpoints

Provides endpoints for:
- Logging learning evidence (from frontend interactions)
- Retrieving student LET dashboard data
- Retrieving teacher LET overview
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from collections import defaultdict

from app.api import deps
from app import models, schemas
from app.models.evidence import EvidenceType
from app.models.doubt import DoubtStatus
from app.models.user import AcademicYear

router = APIRouter()


@router.post("/log", response_model=schemas.EvidenceResponse)
async def log_evidence(
    evidence_data: schemas.EvidenceCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Log a new learning evidence entry.
    Called by frontend after interactions (Vision MCQ, distraction events, etc.)
    """
    evidence = models.LearningEvidence(
        user_id=current_user.id,
        course_id=evidence_data.course_id,
        type=evidence_data.type,
        summary=evidence_data.summary,
        concept_clarity=evidence_data.concept_clarity,
        observation_accuracy=evidence_data.observation_accuracy,
        focus_minutes=evidence_data.focus_minutes,
        distraction_minutes=evidence_data.distraction_minutes,
        details=evidence_data.details
    )
    
    db.add(evidence)
    await db.commit()
    await db.refresh(evidence)
    
    return evidence


@router.get("/student/dashboard", response_model=schemas.StudentLETDashboard)
async def get_student_dashboard(
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get LET dashboard data for current student.
    Includes timeline and all four mandatory graphs.
    """
    # Get evidence entries for timeline
    result = await db.execute(
        select(models.LearningEvidence)
        .where(models.LearningEvidence.user_id == current_user.id)
        .order_by(models.LearningEvidence.created_at.desc())
        .limit(50)
    )
    evidence_entries = result.scalars().all()
    
    # Timeline
    timeline = [
        schemas.TimelineEntry(
            timestamp=e.created_at,
            summary=e.summary,
            type=e.type
        )
        for e in evidence_entries
    ]
    
    # Graph 1: Concept Clarity Trend
    clarity_entries = [e for e in evidence_entries if e.concept_clarity]
    concept_clarity_trend = schemas.ConceptClarityTrend(
        dates=[e.created_at.isoformat() for e in reversed(clarity_entries)],
        clarity_levels=[e.concept_clarity for e in reversed(clarity_entries)]
    )
    
    # Graph 2: Observation Accuracy Trend
    accuracy_entries = [e for e in evidence_entries if e.observation_accuracy is not None]
    observation_accuracy_trend = schemas.ObservationAccuracyTrend(
        dates=[e.created_at.isoformat() for e in reversed(accuracy_entries)],
        accuracy_scores=[e.observation_accuracy for e in reversed(accuracy_entries)]
    )
    
    # Graph 3: Focus vs Distraction Trend (aggregate by day)
    focus_distraction_data = defaultdict(lambda: {"focus": 0.0, "distraction": 0.0})
    for e in evidence_entries:
        if e.focus_minutes or e.distraction_minutes:
            date_key = e.created_at.date().isoformat()
            if e.focus_minutes:
                focus_distraction_data[date_key]["focus"] += e.focus_minutes
            if e.distraction_minutes:
                focus_distraction_data[date_key]["distraction"] += e.distraction_minutes
    
    sorted_dates = sorted(focus_distraction_data.keys())
    focus_distraction_trend = schemas.FocusDistractionTrend(
        dates=sorted_dates,
        focus_minutes=[focus_distraction_data[d]["focus"] for d in sorted_dates],
        distraction_minutes=[focus_distraction_data[d]["distraction"] for d in sorted_dates]
    )
    
    # Graph 4: Doubt Resolution Flow
    doubt_result = await db.execute(
        select(models.Doubt)
        .where(models.Doubt.student_id == current_user.id)
    )
    doubts = doubt_result.scalars().all()
    
    total_doubts = len(doubts)
    resolved_doubts = sum(1 for d in doubts if d.status == DoubtStatus.ANSWERED)
    pending_doubts = total_doubts - resolved_doubts
    
    doubt_resolution = schemas.DoubtResolutionFlow(
        total_doubts=total_doubts,
        resolved_doubts=resolved_doubts,
        pending_doubts=pending_doubts
    )
    
    return schemas.StudentLETDashboard(
        timeline=timeline,
        concept_clarity_trend=concept_clarity_trend,
        observation_accuracy_trend=observation_accuracy_trend,
        focus_distraction_trend=focus_distraction_trend,
        doubt_resolution=doubt_resolution
    )


@router.get("/teacher/overview", response_model=schemas.TeacherLETOverview)
async def get_teacher_overview(
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get LET overview for all students (teacher view).
    Shows summary for each student.
    """
    if current_user.role != models.UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    # Get all students
    result = await db.execute(
        select(models.User)
        .where(models.User.role == models.UserRole.STUDENT)
    )
    students = result.scalars().all()
    
    summaries = []
    for student in students:
        # Get recent evidence to determine trend
        evidence_result = await db.execute(
            select(models.LearningEvidence)
            .where(models.LearningEvidence.user_id == student.id)
            .order_by(models.LearningEvidence.created_at.desc())
            .limit(10)
        )
        recent_evidence = evidence_result.scalars().all()
        
        # Determine learning trend based on concept clarity
        clarity_values = [e.concept_clarity for e in recent_evidence if e.concept_clarity]
        if len(clarity_values) >= 3:
            first_half = clarity_values[len(clarity_values)//2:]
            second_half = clarity_values[:len(clarity_values)//2]
            
            clarity_map = {"low": 1, "medium": 2, "high": 3}
            first_avg = sum(clarity_map.get(c, 0) for c in first_half) / len(first_half) if first_half else 0
            second_avg = sum(clarity_map.get(c, 0) for c in second_half) / len(second_half) if second_half else 0
            
            if second_avg > first_avg + 0.5:
                learning_trend = "Improving"
            elif abs(second_avg - first_avg) <= 0.5:
                learning_trend = "Stable"
            else:
                learning_trend = "Inconsistent"
        else:
            learning_trend = "Insufficient Data"
        
        # Get pending doubts count
        doubt_result = await db.execute(
            select(func.count(models.Doubt.id))
            .where(
                and_(
                    models.Doubt.student_id == student.id,
                    models.Doubt.status == DoubtStatus.PENDING
                )
            )
        )
        pending_doubts = doubt_result.scalar() or 0
        
        # Analyze attention pattern
        distraction_entries = [e for e in recent_evidence if e.distraction_minutes]
        if len(distraction_entries) >= 3:
            avg_distraction = sum(e.distraction_minutes for e in distraction_entries) / len(distraction_entries)
            attention_pattern = "Fatigue signs" if avg_distraction > 5.0 else "Stable"
        else:
            attention_pattern = "Stable"
        
        summaries.append(schemas.StudentLETSummary(
            user_id=student.id,
            full_name=student.full_name or "Unknown",
            usn=student.usn,
            academic_year=student.academic_year.value if student.academic_year else None,
            branch=student.branch,
            learning_trend=learning_trend,
            pending_doubts=pending_doubts,
            attention_pattern=attention_pattern
        ))
    
    return schemas.TeacherLETOverview(students=summaries)


@router.get("/teacher/student/{student_id}", response_model=schemas.StudentLETDashboard)
async def get_student_detail(
    student_id: int,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get detailed LET dashboard for a specific student (teacher view).
    Returns same dashboard as student view.
    """
    if current_user.role != models.UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Only teachers can access this endpoint")
    
    # Verify student exists
    result = await db.execute(
        select(models.User)
        .where(
            and_(
                models.User.id == student_id,
                models.User.role == models.UserRole.STUDENT
            )
        )
    )
    student = result.scalar_one_or_none()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Get evidence entries for timeline
    evidence_result = await db.execute(
        select(models.LearningEvidence)
        .where(models.LearningEvidence.user_id == student_id)
        .order_by(models.LearningEvidence.created_at.desc())
        .limit(50)
    )
    evidence_entries = evidence_result.scalars().all()
    
    # Build same dashboard as student view
    timeline = [
        schemas.TimelineEntry(
            timestamp=e.created_at,
            summary=e.summary,
            type=e.type
        )
        for e in evidence_entries
    ]
    
    clarity_entries = [e for e in evidence_entries if e.concept_clarity]
    concept_clarity_trend = schemas.ConceptClarityTrend(
        dates=[e.created_at.isoformat() for e in reversed(clarity_entries)],
        clarity_levels=[e.concept_clarity for e in reversed(clarity_entries)]
    )
    
    accuracy_entries = [e for e in evidence_entries if e.observation_accuracy is not None]
    observation_accuracy_trend = schemas.ObservationAccuracyTrend(
        dates=[e.created_at.isoformat() for e in reversed(accuracy_entries)],
        accuracy_scores=[e.observation_accuracy for e in reversed(accuracy_entries)]
    )
    
    focus_distraction_data = defaultdict(lambda: {"focus": 0.0, "distraction": 0.0})
    for e in evidence_entries:
        if e.focus_minutes or e.distraction_minutes:
            date_key = e.created_at.date().isoformat()
            if e.focus_minutes:
                focus_distraction_data[date_key]["focus"] += e.focus_minutes
            if e.distraction_minutes:
                focus_distraction_data[date_key]["distraction"] += e.distraction_minutes
    
    sorted_dates = sorted(focus_distraction_data.keys())
    focus_distraction_trend = schemas.FocusDistractionTrend(
        dates=sorted_dates,
        focus_minutes=[focus_distraction_data[d]["focus"] for d in sorted_dates],
        distraction_minutes=[focus_distraction_data[d]["distraction"] for d in sorted_dates]
    )
    
    doubt_result = await db.execute(
        select(models.Doubt)
        .where(models.Doubt.student_id == student_id)
    )
    doubts = doubt_result.scalars().all()
    
    total_doubts = len(doubts)
    resolved_doubts = sum(1 for d in doubts if d.status == DoubtStatus.ANSWERED)
    pending_doubts = total_doubts - resolved_doubts
    
    doubt_resolution = schemas.DoubtResolutionFlow(
        total_doubts=total_doubts,
        resolved_doubts=resolved_doubts,
        pending_doubts=pending_doubts
    )
    
    return schemas.StudentLETDashboard(
        timeline=timeline,
        concept_clarity_trend=concept_clarity_trend,
        observation_accuracy_trend=observation_accuracy_trend,
        focus_distraction_trend=focus_distraction_trend,
        doubt_resolution=doubt_resolution
    )
