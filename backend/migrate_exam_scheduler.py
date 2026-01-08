"""
Database Migration Script for Exam Scheduler

Adds exam_schedules table ONLY. Does NOT modify any existing tables.

This script is SAFE to run multiple times (checks if table exists before creating).
"""

import sqlite3
import sys
import os

# Path to database
DB_PATH = "./coursetwin.db"

def migrate_database():
    print("=" * 60)
    print("EXAM SCHEDULER DATABASE MIGRATION")
    print("=" * 60)
    print()
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        print("   The database will be created automatically when the backend starts.")
        print("   Run the backend first, then run this migration.")
        return
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        changes_made = False
        
        # Check if exam_schedules table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='exam_schedules'")
        if not cursor.fetchone():
            print("➕ Creating 'exam_schedules' table...")
            cursor.execute("""
                CREATE TABLE exam_schedules (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    exam_date DATE NOT NULL,
                    daily_hours REAL NOT NULL,
                    topics TEXT NOT NULL,
                    generated_schedule TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            """)
            
            # Create indexes for better query performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_exam_schedules_user_id ON exam_schedules(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam_date ON exam_schedules(exam_date)")
            
            changes_made = True
            print("   ✅ Created exam_schedules table with indexes")
        else:
            print("   ℹ️  'exam_schedules' table already exists")
        
        if changes_made:
            conn.commit()
            print()
            print("=" * 60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 60)
            print()
            print("Database is ready for Exam Scheduler feature!")
            print()
            print("⚠️  VERIFICATION:")
            print("   - No existing tables were modified")
            print("   - Only exam_schedules table was added")
            print("   - All existing features remain unaffected")
        else:
            print()
            print("=" * 60)
            print("ℹ️  NO CHANGES NEEDED")
            print("=" * 60)
            print()
            print("Database already has the exam_schedules table.")
        
    except Exception as e:
        conn.rollback()
        print()
        print("=" * 60)
        print("❌ MIGRATION FAILED")
        print("=" * 60)
        print(f"Error: {str(e)}")
        raise
    
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_database()
