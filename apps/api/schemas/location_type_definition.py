from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LocationTypeDefinitionBase(BaseModel):
    """Base schema for LocationTypeDefinition with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Location type name (e.g., Shelf, Pallet Rack)")
    code: str = Field(..., min_length=1, max_length=50, description="Location type code (e.g., SHELF, PALLET_RACK)")


class LocationTypeDefinitionCreate(LocationTypeDefinitionBase):
    """Schema for creating a new location type definition."""
    pass


class LocationTypeDefinitionUpdate(BaseModel):
    """Schema for updating an existing location type definition."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)


class LocationTypeDefinitionResponse(LocationTypeDefinitionBase):
    """Schema for location type definition response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
