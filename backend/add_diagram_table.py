"""
Add Diagram Submissions Table
Run this to add the new table without resetting the database.
"""
import asyncio
from app.db.session import engine, Base
from app import models  # This imports all models including DiagramSubmission

async def add_diagram_table():
    print("Adding diagram_submissions table...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Table created (or already exists)")

if __name__ == "__main__":
    asyncio.run(add_diagram_table())
