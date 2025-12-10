from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class DepositorBase(BaseModel):
    """Base schema for Depositor with common fields."""
    name: str = Field(..., min_length=1, max_length=255, description="Depositor name")
    code: str = Field(..., min_length=1, max_length=100, description="Depositor code (unique per tenant)")
    contact_info: Dict[str, Any] = Field(
        default_factory=dict,
        description="Contact information (email, phone, address, etc.)"
    )
    allow_over_receiving: bool = Field(default=False, description="Allow receiving more than expected quantity")


class DepositorCreate(DepositorBase):
    """Schema for creating a new depositor."""
    pass


class DepositorUpdate(BaseModel):
    """Schema for updating an existing depositor."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=100)
    contact_info: Optional[Dict[str, Any]] = None
    allow_over_receiving: Optional[bool] = None


class DepositorResponse(DepositorBase):
    """Schema for depositor response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True