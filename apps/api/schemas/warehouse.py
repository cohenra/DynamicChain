from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class WarehouseBase(BaseModel):
    """Base schema for Warehouse with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Warehouse name")
    code: str = Field(..., min_length=1, max_length=100, description="Warehouse code (unique per tenant)")
    address: str = Field(..., min_length=1, max_length=500, description="Warehouse physical address")


class WarehouseCreate(WarehouseBase):
    """Schema for creating a new warehouse."""
    pass


class WarehouseUpdate(BaseModel):
    """Schema for updating an existing warehouse."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=100)
    address: Optional[str] = Field(None, min_length=1, max_length=500)


class WarehouseResponse(WarehouseBase):
    """Schema for warehouse response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
