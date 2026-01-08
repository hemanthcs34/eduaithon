from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole, AcademicYear

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    full_name: Optional[str] = None
    role: UserRole = UserRole.STUDENT
    
    # Academic Identity (Students only)
    usn: Optional[str] = None
    academic_year: Optional[AcademicYear] = None
    branch: Optional[str] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDBBase(UserBase):
    id: Optional[int] = None

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass
