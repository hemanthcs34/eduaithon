from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class VideoProgressBase(BaseModel):
    video_id: int
    watched_seconds: float = 0.0
    total_seconds: float = 0.0
    max_watched_seconds: float = 0.0

class VideoProgressCreate(VideoProgressBase):
    pass

class VideoProgressUpdate(BaseModel):
    watched_seconds: float
    total_seconds: Optional[float] = None

class VideoProgress(VideoProgressBase):
    id: int
    user_id: int
    completed: bool = False
    last_updated: Optional[datetime] = None
    
    class Config:
        from_attributes = True
