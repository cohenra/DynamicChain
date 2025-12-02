from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """Base schema for Product with common fields."""
    sku: str = Field(..., min_length=1, max_length=255, description="Product SKU")
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    barcode: Optional[str] = Field(None, max_length=255, description="Product barcode")
    custom_attributes: Dict[str, Any] = Field(
        default_factory=dict,
        description="Dynamic product attributes (color, size, material, etc.)"
    )


class ProductCreate(ProductBase):
    """Schema for creating a new product."""
    pass


class ProductUpdate(BaseModel):
    """Schema for updating an existing product."""
    sku: Optional[str] = Field(None, min_length=1, max_length=255)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    barcode: Optional[str] = Field(None, max_length=255)
    custom_attributes: Optional[Dict[str, Any]] = None


class ProductResponse(ProductBase):
    """Schema for product response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
