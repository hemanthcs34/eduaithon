import asyncio
from app.db.session import SessionLocal
from app import models
from sqlalchemy import select

async def fix_duplicates():
    async with SessionLocal() as db:
        print("Scanning for duplicate VideoProgress records...")
        
        # Get all users
        result = await db.execute(select(models.User))
        users = result.scalars().all()
        
        for user in users:
            # Get all progress for user
            result = await db.execute(select(models.VideoProgress).where(models.VideoProgress.user_id == user.id))
            all_progress = result.scalars().all()
            
            # Group by video_id
            by_video = {}
            for p in all_progress:
                if p.video_id not in by_video:
                    by_video[p.video_id] = []
                by_video[p.video_id].append(p)
            
            for vid, records in by_video.items():
                if len(records) > 1:
                    print(f"User {user.id}, Video {vid}: Found {len(records)} duplicates.")
                    # Sort: Completed=True first, then highest max_watched, then highest total_seconds
                    records.sort(key=lambda x: (x.completed, x.max_watched_seconds, x.total_seconds), reverse=True)
                    
                    keep = records[0]
                    discard = records[1:]
                    
                    print(f"  Keeping: Completed={keep.completed}, Max={keep.max_watched_seconds}")
                    
                    for bad in discard:
                        print(f"  Deleting: Completed={bad.completed}, Max={bad.max_watched_seconds}")
                        await db.delete(bad)
        
        await db.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(fix_duplicates())
