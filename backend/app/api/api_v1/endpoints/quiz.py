from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from pydantic import BaseModel
from app import models
from app.api import deps
from app.core.ai_router import generate_quiz

router = APIRouter()

PASS_THRESHOLD = 0.7  # 70% to pass

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None

class QuizResponse(BaseModel):
    quiz_id: int
    trigger_video_index: int
    questions: List[dict]

class QuizSubmission(BaseModel):
    quiz_id: int
    answers: List[str]  # List of selected answers (A, B, C, D)

class QuizResult(BaseModel):
    passed: bool
    score: float
    correct_count: int
    total_count: int
    feedback: List[dict]

@router.get("/course/{course_id}/check")
async def check_quiz_needed(
    course_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Check if student needs to take a quiz (after every 3 completed videos).
    Returns quiz info if needed, null otherwise.
    """
    # Get completed videos count
    videos_result = await db.execute(
        select(models.Video).where(models.Video.course_id == course_id).order_by(models.Video.order_index)
    )
    videos = videos_result.scalars().all()
    
    progress_result = await db.execute(
        select(models.VideoProgress).where(
            models.VideoProgress.user_id == current_user.id,
            models.VideoProgress.video_id.in_([v.id for v in videos]),
            models.VideoProgress.completed == True
        )
    )
    completed_videos = len(progress_result.scalars().all())
    
    # Check if at a quiz checkpoint (3, 6, 9, etc.)
    if completed_videos > 0 and completed_videos % 3 == 0:
        quiz_checkpoint = completed_videos  # e.g., 3, 6, 9
        
        # Check if quiz already passed for this checkpoint
        attempt_result = await db.execute(
            select(models.QuizAttempt)
            .join(models.Quiz)
            .where(
                models.Quiz.course_id == course_id,
                models.Quiz.trigger_video_index == quiz_checkpoint,
                models.QuizAttempt.user_id == current_user.id,
                models.QuizAttempt.passed == True
            )
        )
        existing_pass = attempt_result.scalar_one_or_none()
        
        if not existing_pass:
            return {
                "quiz_needed": True,
                "trigger_video_index": quiz_checkpoint,
                "videos_completed": completed_videos
            }
    
    return {"quiz_needed": False, "videos_completed": completed_videos}

@router.post("/course/{course_id}/generate")
async def generate_quiz(
    course_id: int,
    trigger_video_index: int = 3,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Generate a quiz for a course based on video descriptions and materials.
    Quiz content is based on the 3 videos leading up to this checkpoint.
    """
    # Check if quiz already exists for this checkpoint
    existing_result = await db.execute(
        select(models.Quiz).where(
            models.Quiz.course_id == course_id,
            models.Quiz.trigger_video_index == trigger_video_index
        )
    )
    existing_quiz = existing_result.scalars().first()
    
    if existing_quiz:
        return {
            "quiz_id": existing_quiz.id,
            "trigger_video_index": existing_quiz.trigger_video_index,
            "questions": existing_quiz.questions
        }
    
    # Get the 3 videos for this checkpoint
    # For checkpoint 3: videos at order_index 1, 2, 3
    # For checkpoint 6: videos at order_index 4, 5, 6
    start_index = trigger_video_index - 2  # e.g., 3-2=1 for checkpoint 3
    end_index = trigger_video_index  # e.g., 3 for checkpoint 3
    
    videos_result = await db.execute(
        select(models.Video).where(
            models.Video.course_id == course_id,
            models.Video.order_index >= start_index,
            models.Video.order_index <= end_index
        ).order_by(models.Video.order_index)
    )
    checkpoint_videos = videos_result.scalars().all()
    
    # Extract video descriptions
    video_descriptions = [v.description or v.title for v in checkpoint_videos]
    
    if not video_descriptions:
        raise HTTPException(
            status_code=400, 
            detail="No videos found for this checkpoint. Please add videos with descriptions."
        )
    
    # Get course materials (PDF content) for additional context
    materials_result = await db.execute(
        select(models.CourseMaterial).where(models.CourseMaterial.course_id == course_id)
    )
    materials = materials_result.scalars().all()
    
    # Combine material content
    pdf_content = ""
    for mat in materials:
        if mat.content_text:
            pdf_content += f"=== {mat.title} ===\n{mat.content_text}\n\n"
    
    # Generate quiz using video descriptions + PDF content
    quiz_data = await generate_quiz(
        video_descriptions=video_descriptions,
        pdf_content=pdf_content,
        num_questions=10
    )
    
    if "error" in quiz_data:
        raise HTTPException(status_code=500, detail=quiz_data["error"])
    
    questions = quiz_data.get("questions", [])
    if not questions:
        raise HTTPException(status_code=500, detail="No questions generated. Please try again.")
    
    # Save quiz to database
    quiz = models.Quiz(
        course_id=course_id,
        trigger_video_index=trigger_video_index,
        questions=questions
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    
    return {
        "quiz_id": quiz.id,
        "trigger_video_index": quiz.trigger_video_index,
        "questions": quiz.questions
    }

@router.post("/submit", response_model=QuizResult)
async def submit_quiz(
    submission: QuizSubmission,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Submit quiz answers and get results.
    """
    # Get quiz
    quiz_result = await db.execute(
        select(models.Quiz).where(models.Quiz.id == submission.quiz_id)
    )
    quiz = quiz_result.scalar_one_or_none()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = quiz.questions
    if len(submission.answers) != len(questions):
        raise HTTPException(status_code=400, detail="Answer count mismatch")
    
    # Grade quiz
    correct_count = 0
    feedback = []
    
    for i, (question, user_answer) in enumerate(zip(questions, submission.answers)):
        correct_answer = question.get("correct_answer", "")
        is_correct = user_answer.upper() == correct_answer.upper()
        
        if is_correct:
            correct_count += 1
        
        feedback.append({
            "question_index": i,
            "correct": is_correct,
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "explanation": question.get("explanation", "")
        })
    
    score = correct_count / len(questions) if questions else 0
    passed = score >= PASS_THRESHOLD
    
    # Save attempt
    attempt = models.QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        answers=submission.answers,
        score=score,
        passed=passed
    )
    db.add(attempt)
    await db.commit()
    
    return QuizResult(
        passed=passed,
        score=score * 100,
        correct_count=correct_count,
        total_count=len(questions),
        feedback=feedback
    )

@router.get("/course/{course_id}/status")
async def get_quiz_status(
    course_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get all quiz statuses for a course (which checkpoints are passed).
    """
    # Get all quizzes for course
    quizzes_result = await db.execute(
        select(models.Quiz).where(models.Quiz.course_id == course_id)
    )
    quizzes = quizzes_result.scalars().all()
    
    # Get user's passing attempts
    status = {}
    for quiz in quizzes:
        attempt_result = await db.execute(
            select(models.QuizAttempt).where(
                models.QuizAttempt.quiz_id == quiz.id,
                models.QuizAttempt.user_id == current_user.id,
                models.QuizAttempt.passed == True
            ).limit(1)
        )
        passed_attempt = attempt_result.scalar_one_or_none()
        status[quiz.trigger_video_index] = {
            "quiz_id": quiz.id,
            "passed": passed_attempt is not None,
            "score": passed_attempt.score * 100 if passed_attempt else None
        }
    
    return status
