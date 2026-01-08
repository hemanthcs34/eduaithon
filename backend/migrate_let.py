"""
Database Migration Script for LET Feature

Adds academic fields to users table and creates learning_evidence table.

This script is SAFE to run multiple times (checks if columns exist before adding).
"""

import sqlite3
import sys
import os

# Path to database
DB_PATH = "./coursetwin.db"

def migrate_database():
    print("=" * 60)
    print("LET DATABASE MIGRATION")
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
        # Check if academic fields already exist
        cursor.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in cursor.fetchall()]
        
        changes_made = False
        
        # Add usn column if it doesn't exist
        if 'usn' not in columns:
            print("➕ Adding 'usn' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN usn TEXT")
            changes_made = True
            print("   ✅ Added usn column")
        else:
            print("   ℹ️  'usn' column already exists")
        
        # Add academic_year column if it doesn't exist
        if 'academic_year' not in columns:
            print("➕ Adding 'academic_year' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN academic_year TEXT")
            changes_made = True
            print("   ✅ Added academic_year column")
        else:
            print("   ℹ️  'academic_year' column already exists")
        
        # Add branch column if it doesn't exist
        if 'branch' not in columns:
            print("➕ Adding 'branch' column to users table...")
            cursor.execute("ALTER TABLE users ADD COLUMN branch TEXT")
            changes_made = True
            print("   ✅ Added branch column")
        else:
            print("   ℹ️  'branch' column already exists")
        
        # Check if learning_evidence table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_evidence'")
        if not cursor.fetchone():
            print("➕ Creating 'learning_evidence' table...")
            cursor.execute("""
                CREATE TABLE learning_evidence (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    course_id INTEGER,
                    type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    concept_clarity TEXT,
                    observation_accuracy REAL,
                    focus_minutes REAL,
                    distraction_minutes REAL,
                    details TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (course_id) REFERENCES courses(id)
                )
            """)
            
            # Create indexes for better query performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_learning_evidence_user_id ON learning_evidence(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_learning_evidence_course_id ON learning_evidence(course_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_learning_evidence_type ON learning_evidence(type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_learning_evidence_created_at ON learning_evidence(created_at)")
            
            changes_made = True
            print("   ✅ Created learning_evidence table with indexes")
        else:
            print("   ℹ️  'learning_evidence' table already exists")
        
        if changes_made:
            conn.commit()
            print()
            print("=" * 60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 60)
            print()
            print("Database is ready for LET feature!")
        else:
            print()
            print("=" * 60)
            print("ℹ️  NO CHANGES NEEDED")
            print("=" * 60)
            print()
            print("Database already has all LET tables and columns.")
        
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
