from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class UomDefinitionBase(BaseModel):
    """Base schema for UomDefinition with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="UOM name (e.g., Box, Pallet, Bottle)")
    code: str = Field(..., min_length=1, max_length=50, description="UOM code (e.g., BOX, PLT, EA)")


class UomDefinitionCreate(UomDefinitionBase):
    """Schema for creating a new UOM definition."""
    pass


class UomDefinitionUpdate(BaseModel):
    """Schema for updating an existing UOM definition."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, min_length=1, max_length=50)


class UomDefinitionResponse(UomDefinitionBase):
    """Schema for UOM definition response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
