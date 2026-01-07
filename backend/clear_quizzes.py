import asyncio
from app.db.session import SessionLocal
from app import models
from sqlalchemy import delete

async def clear_quizzes():
    async with SessionLocal() as db:
        print("Clearing all generated quizzes...")
        
        # Delete all quizzes
        await db.execute(delete(models.Quiz))
        
        # Also delete attempts so users can retake
        await db.execute(delete(models.QuizAttempt))
        
        await db.commit()
        print("All quizzes and attempts cleared. Next request will regenerate fresh quizzes.")

if __name__ == "__main__":
    asyncio.run(clear_quizzes())
