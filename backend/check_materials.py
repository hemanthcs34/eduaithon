import asyncio
from app.db.session import SessionLocal
from app import models
from sqlalchemy import select

async def check_materials():
    async with SessionLocal() as db:
        result = await db.execute(select(models.CourseMaterial))
        materials = result.scalars().all()
        
        if not materials:
            print("No materials found in database!")
            return
            
        for mat in materials:
            print(f"Material ID: {mat.id}")
            print(f"  Title: {mat.title}")
            print(f"  Course ID: {mat.course_id}")
            print(f"  File type: {mat.file_type}")
            print(f"  File path: {mat.file_path}")
            content_preview = mat.content_text[:200] if mat.content_text else "EMPTY!"
            print(f"  Content (first 200 chars): {content_preview}")
            print(f"  Content length: {len(mat.content_text) if mat.content_text else 0}")
            print("---")

if __name__ == "__main__":
    asyncio.run(check_materials())
