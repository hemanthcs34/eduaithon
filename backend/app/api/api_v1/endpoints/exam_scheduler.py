"""
Exam Scheduler API Endpoints

Provides supportive exam study scheduling based on:
- Student-defined topic importance (or auto-inferred from LET)
- LET concept clarity data
- Pending doubts count

Logic is transparent and explainable - no black-box AI.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta
from collections import defaultdict

from app.api import deps
from app import models, schemas
from app.models.doubt import DoubtStatus

router = APIRouter()


def infer_topic_importance(
    topic_name: str,
    let_evidence: List[models.LearningEvidence],
    doubts: List[models.Doubt]
) -> str:
    """
    Auto-infer importance if student doesn't set it.
    
    Logic:
    1. Fuzzy match topic name in LET concept clarity entries
    2. Calculate clarity ratio (high clarity / total entries)
    3. Count pending doubts related to topic
    4. Assign importance:
       - Low clarity (< 40% high) OR multiple doubts → High
       - Medium clarity (40-70% high) OR some doubts → Medium
       - High clarity (> 70% high) AND no doubts → Low
       - Default (no data) → Medium
    """
    # Fuzzy match topic name in LET summaries (case-insensitive)
    topic_lower = topic_name.lower()
    clarity_matches = [
        e for e in let_evidence
        if e.concept_clarity and topic_lower in e.summary.lower()
    ]
    
    high_clarity_count = sum(1 for e in clarity_matches if e.concept_clarity == "high")
    total_matches = len(clarity_matches)
    
    clarity_ratio = high_clarity_count / total_matches if total_matches > 0 else None
    
    # Check doubts (fuzzy match in question text)
    doubt_matches = [
        d for d in doubts
        if topic_lower in d.question_text.lower()
    ]
    pending_doubt_count = sum(1 for d in doubt_matches if d.status == DoubtStatus.PENDING)
    
    # Inference logic
    if clarity_ratio is not None:
        if clarity_ratio < 0.4 or pending_doubt_count >= 2:
            return "high"
        elif clarity_ratio > 0.7 and pending_doubt_count == 0:
            return "low"
        else:
            return "medium"
    else:
        # No LET data for topic - use doubts only
        if pending_doubt_count >= 2:
            return "high"
        elif pending_doubt_count == 1:
            return "medium"
        else:
            return "medium"  # Default


def calculate_priority_score(
    topic: schemas.TopicInput,
    let_evidence: List[models.LearningEvidence],
    doubts: List[models.Doubt],
    was_inferred: bool
) -> tuple[float, str]:
    """
    Calculate transparent priority score.
    
    Returns: (priority_score, rationale)
    
    Formula:
    - Base score from importance: High=3, Medium=2, Low=1
    - LET multiplier: Low clarity=1.5x, Medium=1.2x, High=1.0x
    - Doubt penalty: +0.3 per pending doubt
    
    Final = base_score × let_multiplier + doubt_penalty
    """
    importance = topic.importance_level or "medium"
    base_score = {"high": 3, "medium": 2, "low": 1}[importance]
    
    # Calculate LET clarity for this topic
    topic_lower = topic.topic_name.lower()
    clarity_entries = [
        e for e in let_evidence
        if e.concept_clarity and topic_lower in e.summary.lower()
    ]
    
    if clarity_entries:
        clarity_counts = defaultdict(int)
        for e in clarity_entries:
            clarity_counts[e.concept_clarity] += 1
        
        # Determine dominant clarity level
        if clarity_counts["high"] > len(clarity_entries) * 0.6:
            clarity = "high"
        elif clarity_counts["low"] > len(clarity_entries) * 0.4:
            clarity = "low"
        else:
            clarity = "medium"
    else:
        clarity = "medium"  # Default if no data
    
    multiplier = {"low": 1.5, "medium": 1.2, "high": 1.0}[clarity]
    
    # Count pending doubts for this topic
    topic_doubts = [
        d for d in doubts
        if topic_lower in d.question_text.lower() and d.status == DoubtStatus.PENDING
    ]
    doubt_penalty = len(topic_doubts) * 0.3
    
    final_score = base_score * multiplier + doubt_penalty
    
    # Build rationale
    parts = []
    if was_inferred:
        parts.append(f"Auto-set to {importance} importance based on LET")
    else:
        parts.append(f"{importance.capitalize()} importance (set by you)")
    
    if clarity_entries:
        parts.append(f"{clarity} understanding from learning evidence")
    
    if len(topic_doubts) > 0:
        parts.append(f"{len(topic_doubts)} pending doubt(s)")
    
    rationale = " + ".join(parts)
    
    return final_score, rationale


def generate_schedule(
    topics_with_scores: List[tuple[schemas.TopicInput, float, str, bool, str]],
    exam_date: date,
    daily_hours: float
) -> schemas.ScheduleResponse:
    """
    Generate intelligent day-wise study schedule.
    
    Algorithm:
    1. Divide timeline into phases:
       - Phase 1 (First 60%): Deep Learning (Weak topics)
       - Phase 2 (Next 30%): Review & Practice (Medium/Strong topics)
       - Phase 3 (Last 10% or 2 days): Mock Tests & Rapid Revision
    2. Assign specific activity types based on phase and concept clarity.
    """
    today = date.today()
    days_until_exam = (exam_date - today).days
    
    if days_until_exam <= 0:
        raise ValueError("Exam date must be in the future")
    
    # Calculate phases
    final_prep_days = max(1, int(days_until_exam * 0.15))
    review_days = int(days_until_exam * 0.35)
    learning_days = days_until_exam - final_prep_days - review_days
    
    # Calculate total priority score
    total_score = sum(score for _, score, _, _, _ in topics_with_scores)
    total_time = days_until_exam * daily_hours
    
    # Allocate time
    topic_allocations = []
    for topic, score, rationale, is_inferred, clarity in topics_with_scores:
        time_allocated = (score / total_score) * total_time
        topic_allocations.append({
            "topic": topic,
            "remaining": time_allocated,
            "score": score,
            "rationale": rationale,
            "is_inferred": is_inferred,
            "clarity": clarity
        })
    
    # Sort by priority
    topic_allocations.sort(key=lambda x: x["score"], reverse=True)
    
    days = []
    current_day = today
    
    for day_num in range(days_until_exam):
        day_date = current_day + timedelta(days=day_num)
        day_tasks = []
        day_hours_used = 0
        
        # Determine Phase
        remaining_days = days_until_exam - day_num
        if remaining_days <= final_prep_days:
            phase = "Final Prep"
        elif remaining_days <= final_prep_days + review_days:
            phase = "Review & Practice"
        else:
            phase = "Deep Learning"
            
        # Select topics based on phase strategy
        # Phase 1: Prioritize Low clarity (Deep Learning)
        # Phase 2: Prioritize Medium clarity (Practice)
        # Phase 3: All topics (Rapid Revision)
        
        candidate_indices = []
        for i, alloc in enumerate(topic_allocations):
            if alloc["remaining"] < 0.2: continue # minimal time check
            
            clarity = alloc["clarity"]
            if phase == "Deep Learning":
                # Prefer low/medium clarity, or high priority score
                if clarity in ["low", "unknown"] or alloc["score"] > 4.0:
                    candidate_indices.append(i)
            elif phase == "Review & Practice":
                # Prefer medium/high clarity
                if clarity in ["medium", "high"] or alloc["score"] > 3.0:
                    candidate_indices.append(i)
            else: # Final Prep
                candidate_indices.append(i) # Any topic is fair game
        
        # Fallback: if no candidates fit phase, take any with remaining time
        if not candidate_indices:
            candidate_indices = [i for i, a in enumerate(topic_allocations) if a["remaining"] >= 0.2]
            
        # Task Selection for the day
        topics_added = 0
        max_topics = 3 if phase != "Final Prep" else 5 # More topics/day in final prep
        
        # Sort candidates by remaining time (descending) to clear backlog
        candidate_indices.sort(key=lambda i: topic_allocations[i]["remaining"], reverse=True)
        
        for idx in candidate_indices:
            if day_hours_used >= daily_hours or topics_added >= max_topics:
                break
                
            alloc = topic_allocations[idx]
            available_time = daily_hours - day_hours_used
            
            # Determine Activity Type & Duration
            if phase == "Final Prep":
                activity = "Mock Test / Rapid Revision"
                duration = min(alloc["remaining"], available_time, 1.5) # Shorter bursts
            elif phase == "Review & Practice":
                activity = "Practice Problems" if alloc["clarity"] != "low" else "Concept Revision"
                duration = min(alloc["remaining"], available_time, 2.0)
            else: # Deep Learning
                activity = "Concept Learning" if alloc["clarity"] in ["low", "unknown"] else "Advanced Review"
                duration = min(alloc["remaining"], available_time, 3.0) # Deep work
            
            if duration < 0.5: continue
            
            day_tasks.append(schemas.StudyTask(
                topic=alloc["topic"].topic_name,
                activity_type=activity,
                duration_hours=round(duration, 1),
                priority_score=round(alloc["score"], 2),
                importance_level=alloc["topic"].importance_level or "medium",
                is_inferred=alloc["is_inferred"],
                rationale=alloc["rationale"]
            ))
            
            alloc["remaining"] -= duration
            day_hours_used += duration
            topics_added += 1
            
        if day_tasks:
            days.append(schemas.DaySchedule(
                date=day_date.isoformat(),
                phase=phase,
                tasks=day_tasks,
                total_hours=round(day_hours_used, 1)
            ))
            
    return schemas.ScheduleResponse(
        days=days,
        total_study_hours=round(sum(d.total_hours for d in days), 1),
        days_until_exam=days_until_exam,
        topics_covered=len(topics_with_scores)
    )


@router.post("/generate", response_model=schemas.ScheduleResponse)
async def generate_exam_schedule(
    schedule_request: schemas.ExamScheduleCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Generate exam study schedule based on topics and LET insights.
    
    - Auto-infers importance if not set
    - Uses LET data to prioritize weak topics
    - Distributes time proportionally across days
    """
    # Fetch LET evidence for this student
    let_result = await db.execute(
        select(models.LearningEvidence)
        .where(models.LearningEvidence.user_id == current_user.id)
        .order_by(models.LearningEvidence.created_at.desc())
        .limit(100)  # Recent evidence
    )
    let_evidence = let_result.scalars().all()
    
    # Fetch doubts for this student
    doubt_result = await db.execute(
        select(models.Doubt)
        .where(models.Doubt.student_id == current_user.id)
    )
    doubts = doubt_result.scalars().all()
    
    # Process topics: infer importance and calculate scores
    topics_with_scores = []
    for topic in schedule_request.topics:
        was_inferred = False
        
        # Auto-infer importance if not set
        if not topic.importance_level:
            topic.importance_level = infer_topic_importance(
                topic.topic_name,
                let_evidence,
                doubts
            )
            was_inferred = True
        
        # Calculate priority score
        score, rationale = calculate_priority_score(
            topic,
            let_evidence,
            doubts,
            was_inferred
        )
        
        # Get clarity for activity type determination
        # Re-using the logic from calculate_priority_score slightly inefficiently but safely
        topic_lower = topic.topic_name.lower()
        clarity_entries = [e for e in let_evidence if e.concept_clarity and topic_lower in e.summary.lower()]
        if clarity_entries:
            high_count = sum(1 for e in clarity_entries if e.concept_clarity == 'high')
            if high_count > len(clarity_entries) * 0.6: clarity = "high"
            elif sum(1 for e in clarity_entries if e.concept_clarity == 'low') > len(clarity_entries) * 0.4: clarity = "low"
            else: clarity = "medium"
        else:
            clarity = "unknown"

        topics_with_scores.append((topic, score, rationale, was_inferred, clarity))
    
    # Generate schedule
    schedule = generate_schedule(
        topics_with_scores,
        schedule_request.exam_date,
        schedule_request.daily_hours
    )
    
    return schedule


@router.get("/my-schedules", response_model=List[schemas.ExamScheduleResponse])
async def get_my_schedules(
    db: AsyncSession = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Get all saved schedules for current student (optional feature).
    """
    result = await db.execute(
        select(models.ExamSchedule)
        .where(models.ExamSchedule.user_id == current_user.id)
        .order_by(models.ExamSchedule.created_at.desc())
    )
    schedules = result.scalars().all()
    
    # Note: For MVP, this might return empty list if persistence is skipped
    return []  # Persistence is optional for now
