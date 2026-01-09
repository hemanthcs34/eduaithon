"""
Seed Render Database with initial course
Run with: python seed_render.py
"""
import asyncio
from sqlalchemy import text
from app.db.session import create_async_engine

# Render External Database URL (same as debug_enrollments.py)
DATABASE_URL = "postgresql+asyncpg://eduaithon_user:YUHnxjbFhuFZtQS8qi0Wp5qnkCX1JlBr@dpg-d5gduu15pdvs73cjnqhg-a.oregon-postgres.render.com/eduaithon"

async def seed_database():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    # Use connect() instead of begin() to match debug script
    async with engine.connect() as conn:
        # Check if course already exists
        result = await conn.execute(text("SELECT COUNT(*) FROM courses"))
        count = result.scalar()
        
        if count > 0:
            print(f"Database already has {count} course(s). Skipping seed.")
            await engine.dispose()
            return
        
        # Get teacher ID (should be 1)
        result = await conn.execute(text("SELECT id FROM users WHERE role = 'teacher' LIMIT 1"))
        teacher = result.fetchone()
        
        if not teacher:
            print("ERROR: No teacher found in database!")
            await engine.dispose()
            return
        
        teacher_id = teacher[0]
        print(f"Found teacher with ID: {teacher_id}")
        
        # Insert course with explicit commit
        await conn.execute(text("""
            INSERT INTO courses (title, description, teacher_id, created_at)
            VALUES (:title, :description, :teacher_id, NOW())
        """), {
            "title": "Computer Vision Fundamentals",
            "description": "Deep learning for vision applications",
            "teacher_id": teacher_id
        })
        await conn.commit()
        
        print("SUCCESS! Course created!")
        print("Now go to: https://eduaithon.vercel.app/teacher/courses/1")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_database())
