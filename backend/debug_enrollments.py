import asyncio
from sqlalchemy import text
from app.db.session import create_async_engine

# Render External Database URL
DATABASE_URL = "postgresql+asyncpg://eduaithon_user:YUHnxjbFhuFZtQS8qi0Wp5qnkCX1JlBr@dpg-d5gduu15pdvs73cjnqhg-a.oregon-postgres.render.com/eduaithon"

async def debug_db():
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    async with engine.connect() as conn:
        print("\n=== SYSTEM REPORT ===")
        
        # Count check
        rows = await conn.execute(text("SELECT count(*) FROM users"))
        user_count = rows.scalar()
        
        rows = await conn.execute(text("SELECT count(*) FROM courses"))
        course_count = rows.scalar()
        
        rows = await conn.execute(text("SELECT count(*) FROM enrollments"))
        enrollment_count = rows.scalar()
        
        print(f"Total Users: {user_count}")
        print(f"Total Courses: {course_count}")
        print(f"Total Enrollments: {enrollment_count}")

        print("\n=== USERS ===")
        result = await conn.execute(text("SELECT id, email, role, full_name FROM users"))
        users = result.fetchall()
        for u in users:
            print(f"ID: {u.id} | {u.email} ({u.role}) - {u.full_name}")

        print("\n=== COURSES ===")
        result = await conn.execute(text("SELECT id, title, teacher_id FROM courses"))
        courses = result.fetchall()
        if not courses:
            print("NO COURSES FOUND!")
        for c in courses:
            print(f"ID: {c.id} | Title: {c.title} | TeacherID: {c.teacher_id}")

        print("\n=== ENROLLMENTS ===")
        result = await conn.execute(text("SELECT id, student_id, course_id, status FROM enrollments"))
        enrollments = result.fetchall()
        if not enrollments:
            print("NO ENROLLMENTS FOUND!")
        for e in enrollments:
            print(f"ID: {e.id} | StudentID: {e.student_id} -> CourseID: {e.course_id} | Status: {e.status}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(debug_db())
