from datetime import datetime
from pydantic import BaseModel, EmailStr
from models.user import UserRole


class UserCreate(BaseModel):
    """Schema for creating a new user."""
    tenant_id: int
    email: EmailStr
    password: str
    role: UserRole
    full_name: str


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    tenant_id: int
    email: str
    role: UserRole
    full_name: str
    created_at: datetime

    class Config:
        from_attributes = True
