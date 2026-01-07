"""
Database Reset Script
This script will:
1. Drop all existing tables
2. Recreate them with the new schema (including UniqueConstraints)
3. Create a default teacher account for testing
4. Delete all uploaded files

Run with: cd backend && python reset_database.py
"""
import asyncio
import os
import shutil
from sqlalchemy import text
from app.db.session import engine, Base, SessionLocal
from app import models
from app.core.security import get_password_hash

async def reset_database():
    print("=" * 50)
    print("DATABASE RESET SCRIPT")
    print("=" * 50)
    
    # Step 1: Drop all tables
    print("\n[1/4] Dropping all existing tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    print("✓ All tables dropped")
    
    # Step 2: Recreate all tables with new schema
    print("\n[2/4] Creating tables with new schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ All tables created with new constraints")
    
    # Step 3: Create default accounts
    print("\n[3/4] Creating default accounts...")
    async with SessionLocal() as db:
        # Create teacher account
        teacher = models.User(
            email="teacher@example.com",
            full_name="Demo Teacher",
            hashed_password=get_password_hash("teacher123"),
            role=models.UserRole.TEACHER,
            is_active=True
        )
        db.add(teacher)
        
        # Create student account
        student = models.User(
            email="student@example.com",
            full_name="Demo Student",
            hashed_password=get_password_hash("student123"),
            role=models.UserRole.STUDENT,
            is_active=True
        )
        db.add(student)
        
        await db.commit()
    print("✓ Default accounts created:")
    print("  Teacher: teacher@example.com / teacher123")
    print("  Student: student@example.com / student123")
    
    # Step 4: Clear uploads folder
    print("\n[4/4] Clearing uploads folder...")
    uploads_path = os.path.join(os.path.dirname(__file__), "uploads")
    if os.path.exists(uploads_path):
        shutil.rmtree(uploads_path)
        os.makedirs(uploads_path)
        print(f"✓ Cleared {uploads_path}")
    else:
        os.makedirs(uploads_path, exist_ok=True)
        print(f"✓ Created {uploads_path}")
    
    print("\n" + "=" * 50)
    print("DATABASE RESET COMPLETE!")
    print("You can now start fresh with your Computer Vision course.")
    print("=" * 50)

if __name__ == "__main__":
    asyncio.run(reset_database())
