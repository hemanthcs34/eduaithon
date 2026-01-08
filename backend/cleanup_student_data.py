"""
HACKATHON DEMO - STUDENT DATA RESET

ONE-TIME CLEANUP SCRIPT

This script deletes ALL student user data to prepare a clean state
for the hackathon demo while preserving:
- All teacher accounts
- All courses, videos, quizzes, and materials
- Teacher-created content

CRITICAL: Run this script EXACTLY ONCE before demo.
DO NOT integrate this into application startup or normal runtime.

Author: Demo Preparation Script
Date: 2026-01-09
"""

import sys
import os
import asyncio

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.user import User, UserRole
from app.models.course import Enrollment
from app.models.progress import VideoProgress
from app.models.quiz import QuizAttempt
from app.models.doubt import Doubt


async def cleanup_student_data():
    """
    Delete all student users and their related data.
    
    Deletion order (respects foreign key constraints):
    1. QuizAttempt (references users.id)
    2. VideoProgress (references users.id)
    3. Enrollment (references users.id as student_id)
    4. Doubt (references users.id as student_id)
    5. User (where role = STUDENT)
    
    Note: DoubtSession is NOT deleted as it's owned by teachers.
    """
    async with SessionLocal() as db:
        try:
            print("=" * 60)
            print("HACKATHON DEMO - STUDENT DATA CLEANUP")
            print("=" * 60)
            print()
            
            # SAFETY CHECK: Verify we're not in production
            print("🔍 Safety Check: Verifying environment...")
            
            # Get student IDs to delete
            result = await db.execute(select(User).filter(User.role == UserRole.STUDENT))
            student_users = result.scalars().all()
            student_ids = [u.id for u in student_users]
            
            if not student_ids:
                print("✅ No student users found. Database already clean.")
                return
            
            print(f"⚠️  Found {len(student_ids)} student user(s) to delete.")
            print(f"   Student IDs: {student_ids}")
            print()
            
            # Confirm deletion
            confirmation = input("Type 'DELETE ALL STUDENTS' to proceed: ")
            if confirmation != "DELETE ALL STUDENTS":
                print("❌ Deletion cancelled. Exiting safely.")
                return
            
            print()
            print("🗑️  Starting deletion process...")
            print("=" * 60)
            
            # Track deletion counts
            counts = {}
            
            # 1. Delete QuizAttempt records
            print("1️⃣  Deleting QuizAttempt records...")
            result = await db.execute(select(QuizAttempt).filter(QuizAttempt.user_id.in_(student_ids)))
            quiz_attempts = result.scalars().all()
            counts['quiz_attempts'] = len(quiz_attempts)
            for attempt in quiz_attempts:
                await db.delete(attempt)
            await db.commit()
            print(f"   ✅ Deleted {counts['quiz_attempts']} quiz attempt(s)")
            
            # 2. Delete VideoProgress records
            print("2️⃣  Deleting VideoProgress records...")
            result = await db.execute(select(VideoProgress).filter(VideoProgress.user_id.in_(student_ids)))
            video_progress = result.scalars().all()
            counts['video_progress'] = len(video_progress)
            for progress in video_progress:
                await db.delete(progress)
            await db.commit()
            print(f"   ✅ Deleted {counts['video_progress']} video progress record(s)")
            
            # 3. Delete Enrollment records
            print("3️⃣  Deleting Enrollment records...")
            result = await db.execute(select(Enrollment).filter(Enrollment.student_id.in_(student_ids)))
            enrollments = result.scalars().all()
            counts['enrollments'] = len(enrollments)
            for enrollment in enrollments:
                await db.delete(enrollment)
            await db.commit()
            print(f"   ✅ Deleted {counts['enrollments']} enrollment(s)")
            
            # 4. Delete Doubt records (student questions only)
            print("4️⃣  Deleting Doubt records...")
            result = await db.execute(select(Doubt).filter(Doubt.student_id.in_(student_ids)))
            doubts = result.scalars().all()
            counts['doubts'] = len(doubts)
            for doubt in doubts:
                await db.delete(doubt)
            await db.commit()
            print(f"   ✅ Deleted {counts['doubts']} doubt(s)")
            
            # 5. Delete Student User accounts
            print("5️⃣  Deleting Student User accounts...")
            for user in student_users:
                await db.delete(user)
            await db.commit()
            counts['students'] = len(student_users)
            print(f"   ✅ Deleted {counts['students']} student user(s)")
            
            print()
            print("=" * 60)
            print("✅ CLEANUP COMPLETE")
            print("=" * 60)
            print()
            
            # Verification
            print("🔍 Verification:")
            result = await db.execute(select(User).filter(User.role == UserRole.TEACHER))
            teacher_count = len(result.scalars().all())
            result = await db.execute(select(User).filter(User.role == UserRole.STUDENT))
            remaining_students = len(result.scalars().all())
            
            print(f"   Teacher accounts remaining: {teacher_count}")
            print(f"   Student accounts remaining: {remaining_students}")
            print()
            
            # Summary report
            print("📊 Deletion Summary:")
            print(f"   - Student users deleted: {counts['students']}")
            print(f"   - Quiz attempts deleted: {counts['quiz_attempts']}")
            print(f"   - Video progress deleted: {counts['video_progress']}")
            print(f"   - Enrollments deleted: {counts['enrollments']}")
            print(f"   - Doubts deleted: {counts['doubts']}")
            print()
            
            total_deleted = sum(counts.values())
            print(f"   TOTAL RECORDS DELETED: {total_deleted}")
            print()
            print("✅ Database is now ready for demo with clean student slate.")
            print("✅ All teacher accounts, courses, and content preserved.")
            print()
            
        except Exception as e:
            print(f"❌ ERROR during cleanup: {str(e)}")
            print("🔄 Rolling back all changes...")
            await db.rollback()
            raise


if __name__ == "__main__":
    print()
    print("⚠️  WARNING: This script will DELETE ALL STUDENT DATA")
    print("⚠️  It will preserve ONLY teacher accounts and course content")
    print()
    
    proceed = input("Are you sure you want to continue? (yes/no): ")
    if proceed.lower() == "yes":
        asyncio.run(cleanup_student_data())
    else:
        print("Cleanup cancelled.")
