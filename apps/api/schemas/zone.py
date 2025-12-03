from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ZoneBase(BaseModel):
    """Base schema for Zone with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Zone name (e.g., 'Dry Food')")
    code: str = Field(..., min_length=1, max_length=50, description="Zone code (e.g., 'A-ZONE')")


class ZoneCreate(ZoneBase):
    """Schema for creating a new zone."""
    warehouse_id: int = Field(..., description="ID of the warehouse this zone belongs to")


class ZoneUpdate(BaseModel):
    """Schema for updating an existing zone."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)


class ZoneResponse(ZoneBase):
    """Schema for zone response."""
    id: int
    warehouse_id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
