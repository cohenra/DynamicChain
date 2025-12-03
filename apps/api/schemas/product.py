from datetime import datetime
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


class ProductBase(BaseModel):
    """Base schema for Product with common fields."""
    sku: str = Field(..., min_length=1, max_length=255, description="Product SKU")
    name: str = Field(..., min_length=1, max_length=255, description="Product name")
    barcode: Optional[str] = Field(None, max_length=255, description="Product barcode")
    base_uom_id: Optional[int] = Field(None, description="Base Unit of Measure ID from UOM definitions")
    depositor_id: Optional[int] = Field(None, description="Depositor ID (product owner)")
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
    base_uom_id: Optional[int] = Field(None, description="Base Unit of Measure ID from UOM definitions")
    depositor_id: Optional[int] = None
    custom_attributes: Optional[Dict[str, Any]] = None


class ProductUOMInfo(BaseModel):
    """Minimal ProductUOM info for product response."""
    id: int
    uom_id: int
    uom_name: str
    uom_code: str
    conversion_factor: float
    barcode: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    volume: Optional[float] = None
    weight: Optional[float] = None

    class Config:
        from_attributes = True


class ProductResponse(ProductBase):
    """Schema for product response."""
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime
    uoms: List[ProductUOMInfo] = Field(default_factory=list, description="List of configured UOMs for this product")
    depositor_name: Optional[str] = Field(None, description="Name of the depositor")
    base_uom_name: Optional[str] = Field(None, description="Name of the base unit of measure")

    class Config:
        from_attributes = True
