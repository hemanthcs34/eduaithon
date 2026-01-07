from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import select
from app import models, schemas
from app.api import deps
import os

router = APIRouter()

@router.get("/{video_id}/stream")
async def stream_video(
    video_id: int,
    db: Session = Depends(deps.get_db),
) -> StreamingResponse:
    """
    Stream a video file.
    """
    result = await db.execute(select(models.Video).where(models.Video.id == video_id))
    video = result.scalar_one_or_none()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    file_path = video.url
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    def iterfile():
        with open(file_path, mode="rb") as file:
            yield from file
    
    return StreamingResponse(iterfile(), media_type="video/mp4")

@router.get("/{video_id}/progress", response_model=schemas.VideoProgress)
async def get_video_progress(
    video_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get progress for a specific video.
    """
    result = await db.execute(
        select(models.VideoProgress).where(
            models.VideoProgress.video_id == video_id,
            models.VideoProgress.user_id == current_user.id
        ).limit(1)
    )
    progress = result.scalars().first()
    
    if not progress:
        # Return default progress if none exists
        return {
            "id": 0,
            "user_id": current_user.id,
            "video_id": video_id,
            "watched_seconds": 0.0,
            "total_seconds": 0.0,
            "max_watched_seconds": 0.0,
            "completed": False,
            "last_updated": None
        }
    
    return progress

@router.post("/{video_id}/progress", response_model=schemas.VideoProgress)
async def update_video_progress(
    video_id: int,
    progress_in: schemas.VideoProgressUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update progress for a video. Enforces that max_watched_seconds only increases.
    """
    result = await db.execute(
        select(models.VideoProgress).where(
            models.VideoProgress.video_id == video_id,
            models.VideoProgress.user_id == current_user.id
        ).limit(1)
    )
    progress = result.scalars().first()
    
    if not progress:
        # Create new progress record
        progress = models.VideoProgress(
            user_id=current_user.id,
            video_id=video_id,
            watched_seconds=progress_in.watched_seconds,
            total_seconds=progress_in.total_seconds or 0.0,
            max_watched_seconds=progress_in.watched_seconds
        )
        db.add(progress)
    else:
        # Update existing - max_watched_seconds can only increase
        progress.watched_seconds = progress_in.watched_seconds
        if progress_in.total_seconds:
            progress.total_seconds = progress_in.total_seconds
        # Only update max if current position is greater
        if progress_in.watched_seconds > progress.max_watched_seconds:
            progress.max_watched_seconds = progress_in.watched_seconds
        
        # Mark as completed if watched 95% or more
        if progress.total_seconds > 0 and progress.max_watched_seconds / progress.total_seconds >= 0.90:
            progress.completed = True
    
    await db.commit()
    await db.refresh(progress)
    return progress

@router.get("/course/{course_id}/progress")
async def get_course_progress(
    course_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get progress for all videos in a course.
    Blocks access at videos 4, 7, 10, etc. until quiz is passed.
    """
    # Get all videos in course
    videos_result = await db.execute(
        select(models.Video).where(models.Video.course_id == course_id).order_by(models.Video.order_index)
    )
    videos = videos_result.scalars().all()
    
    # Get progress for each video
    progress_result = await db.execute(
        select(models.VideoProgress).where(
            models.VideoProgress.user_id == current_user.id,
            models.VideoProgress.video_id.in_([v.id for v in videos])
        )
    )
    progress_map = {p.video_id: p for p in progress_result.scalars().all()}
    
    # Get quiz passes
    quiz_pass_result = await db.execute(
        select(models.Quiz.trigger_video_index)
        .join(models.QuizAttempt)
        .where(
            models.Quiz.course_id == course_id,
            models.QuizAttempt.user_id == current_user.id,
            models.QuizAttempt.passed == True
        )
    )
    passed_checkpoints = set(row[0] for row in quiz_pass_result.fetchall())
    
    result = []
    completed_count = 0
    
    for video in videos:
        prog = progress_map.get(video.id)
        is_completed = prog.completed if prog else False
        
        if is_completed:
            completed_count += 1
        
        result.append({
            "video_id": video.id,
            "video_title": video.title,
            "order_index": video.order_index,
            "watched_seconds": prog.watched_seconds if prog else 0.0,
            "total_seconds": prog.total_seconds if prog else 0.0,
            "max_watched_seconds": prog.max_watched_seconds if prog else 0.0,
            "completed": is_completed,
            "can_access": True
        })
    
    # Enforce sequential access with quiz checkpoints
    for i, item in enumerate(result):
        video_number = i + 1  # 1-indexed
        
        if i == 0:
            item["can_access"] = True
        else:
            # Check if previous video is completed
            prev_completed = result[i-1]["completed"]
            
            # Check if we're at a quiz checkpoint boundary
            # Video 4 requires quiz at checkpoint 3, video 7 requires quiz at checkpoint 6, etc.
            checkpoint_before = ((video_number - 1) // 3) * 3
            
            if checkpoint_before > 0 and checkpoint_before not in passed_checkpoints:
                item["can_access"] = False
                item["quiz_required"] = checkpoint_before
            else:
                item["can_access"] = prev_completed
    
    # Add quiz status
    total_completed = sum(1 for r in result if r["completed"])
    current_checkpoint = (total_completed // 3) * 3
    needs_quiz = current_checkpoint > 0 and current_checkpoint not in passed_checkpoints and total_completed > 0 and total_completed % 3 == 0
    
    return {
        "videos": result,
        "quiz_needed": needs_quiz,
        "quiz_checkpoint": current_checkpoint if needs_quiz else None,
        "passed_checkpoints": list(passed_checkpoints)
    }

