import asyncio
from app.db.session import SessionLocal
from app import models
from sqlalchemy import select

async def check_progress():
    async with SessionLocal() as db:
        # Get the latest user (assuming user is logged in, but for script we pick ID 1 or iterate)
        result = await db.execute(select(models.User).limit(1))
        user = result.scalars().first()
        
        if not user:
            print("No users found.")
            return

        result = await db.execute(select(models.VideoProgress).where(models.VideoProgress.user_id == user.id))
        progresses = result.scalars().all()

        with open("db_dump.txt", "w") as f:
            f.write(f"Checking progress for User: {user.id} ({user.email})\n")
            f.write(f"Found {len(progresses)} progress records:\n")
            for p in progresses:
                f.write(f"Video ID: {p.video_id}\n")
                f.write(f"  Watched: {p.watched_seconds}\n")
                f.write(f"  Max: {p.max_watched_seconds}\n")
                f.write(f"  Total: {p.total_seconds}\n")
                f.write(f"  Completed: {p.completed}\n")
                if p.total_seconds > 0:
                    ratio = p.max_watched_seconds / p.total_seconds
                    f.write(f"  Ratio: {ratio:.4f}\n")
                else:
                    f.write("  Ratio: N/A (Total is 0)\n")
                f.write("-" * 20 + "\n")

if __name__ == "__main__":
    asyncio.run(check_progress())
