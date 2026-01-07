from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class CourseMaterialBase(BaseModel):
    title: str
    file_type: str

class CourseMaterialCreate(CourseMaterialBase):
    pass

class CourseMaterial(CourseMaterialBase):
    id: int
    course_id: int
    file_path: str
    content_text: Optional[str] = None
    chromadb_collection: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
