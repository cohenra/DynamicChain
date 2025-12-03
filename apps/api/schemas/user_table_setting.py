from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class UserTableSettingBase(BaseModel):
    """Base schema for UserTableSetting with common fields."""
    table_name: str = Field(..., min_length=1, max_length=100, description="Name of the table (e.g., 'locations', 'products')")
    settings_json: Dict[str, Any] = Field(..., description="JSON object containing column order, visibility, page size, etc.")


class UserTableSettingCreate(UserTableSettingBase):
    """Schema for creating a new user table setting."""
    pass


class UserTableSettingUpdate(BaseModel):
    """Schema for updating an existing user table setting."""
    settings_json: Dict[str, Any] = Field(..., description="Updated settings JSON")


class UserTableSettingResponse(UserTableSettingBase):
    """Schema for user table setting response."""
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
