from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LocationUsageDefinitionBase(BaseModel):
    """Base schema for LocationUsageDefinition with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Location usage name (e.g., Picking, Storage)")
    code: str = Field(..., min_length=1, max_length=50, description="Location usage code (e.g., PICKING, STORAGE)")


class LocationUsageDefinitionCreate(LocationUsageDefinitionBase):
    """Schema for creating a new location usage definition."""
    pass


class LocationUsageDefinitionUpdate(BaseModel):
    """Schema for updating an existing location usage definition."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)


class LocationUsageDefinitionResponse(LocationUsageDefinitionBase):
    """Schema for location usage definition response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
