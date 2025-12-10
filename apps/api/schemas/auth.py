from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Login request schema."""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response schema."""
    access_token: str
    token_type: str = "bearer"
    user_id: int
    tenant_id: int
    role: str
    warehouse_id: Optional[int] = None


class TokenData(BaseModel):
    """JWT token payload data."""
    user_id: int
    tenant_id: int
    email: str
    role: str
