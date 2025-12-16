"""
Pydantic schemas for OrderTypeDefinition API.
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class OrderTypeBehaviorEnum(str, Enum):
    """Behavior keys for internal business logic."""
    B2B = "B2B"
    ECOM = "ECOM"
    TRANSFER = "TRANSFER"
    RETAIL = "RETAIL"
    RETURN = "RETURN"


class OrderTypeDefinitionCreate(BaseModel):
    """Schema for creating a new order type."""
    code: str = Field(..., min_length=1, max_length=50, description="Unique code for the order type")
    name: str = Field(..., min_length=1, max_length=100, description="Display name")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")
    default_priority: int = Field(5, ge=1, le=20, description="Default priority (1-20)")
    behavior_key: OrderTypeBehaviorEnum = Field(OrderTypeBehaviorEnum.B2B, description="Behavior key for business logic")
    is_active: bool = Field(True, description="Whether the type is active/selectable")


class OrderTypeDefinitionUpdate(BaseModel):
    """Schema for updating an order type."""
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    default_priority: Optional[int] = Field(None, ge=1, le=20)
    behavior_key: Optional[OrderTypeBehaviorEnum] = None
    is_active: Optional[bool] = None


class OrderTypeDefinitionResponse(BaseModel):
    """Response schema for order type."""
    id: int
    tenant_id: int
    code: str
    name: str
    description: Optional[str]
    default_priority: int
    behavior_key: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class OrderTypeDefinitionListResponse(BaseModel):
    """Simplified response for list endpoints."""
    id: int
    code: str
    name: str
    default_priority: int
    behavior_key: str
    is_active: bool

    class Config:
        from_attributes = True


class OrderTypeSelectOption(BaseModel):
    """Schema for dropdown/select options in frontend."""
    id: int
    code: str
    name: str
    default_priority: int
    behavior_key: str

    class Config:
        from_attributes = True
