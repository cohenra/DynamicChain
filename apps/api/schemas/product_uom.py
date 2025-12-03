from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class ProductUOMBase(BaseModel):
    """Base schema for ProductUOM with common fields."""
    uom_id: int = Field(..., description="UOM Definition ID from UOM definitions")
    conversion_factor: float = Field(..., gt=0, description="How many base units are in this UOM (must be > 0)")
    barcode: Optional[str] = Field(None, max_length=255, description="Barcode specific to this package")
    length: Optional[float] = Field(None, gt=0, description="Length in cm")
    width: Optional[float] = Field(None, gt=0, description="Width in cm")
    height: Optional[float] = Field(None, gt=0, description="Height in cm")
    volume: Optional[float] = Field(None, gt=0, description="Volume in cubic cm (computed from L*W*H if not provided)")
    weight: Optional[float] = Field(None, gt=0, description="Weight in kg")

    @field_validator('conversion_factor')
    @classmethod
    def validate_conversion_factor(cls, v: float) -> float:
        """Validate that conversion_factor is greater than 0."""
        if v <= 0:
            raise ValueError('Conversion factor must be greater than 0')
        return v


class ProductUOMCreate(ProductUOMBase):
    """Schema for creating a new ProductUOM."""
    product_id: int = Field(..., description="Product ID this UOM belongs to")

    def compute_volume(self) -> Optional[float]:
        """Compute volume from length, width, height if not provided."""
        if self.volume is not None:
            return self.volume
        if self.length is not None and self.width is not None and self.height is not None:
            return self.length * self.width * self.height
        return None


class ProductUOMUpdate(BaseModel):
    """Schema for updating an existing ProductUOM."""
    uom_id: Optional[int] = Field(None, description="UOM Definition ID from UOM definitions")
    conversion_factor: Optional[float] = Field(None, gt=0)
    barcode: Optional[str] = Field(None, max_length=255)
    length: Optional[float] = Field(None, gt=0)
    width: Optional[float] = Field(None, gt=0)
    height: Optional[float] = Field(None, gt=0)
    volume: Optional[float] = Field(None, gt=0)
    weight: Optional[float] = Field(None, gt=0)

    @field_validator('conversion_factor')
    @classmethod
    def validate_conversion_factor(cls, v: Optional[float]) -> Optional[float]:
        """Validate that conversion_factor is greater than 0."""
        if v is not None and v <= 0:
            raise ValueError('Conversion factor must be greater than 0')
        return v


class ProductUOMResponse(ProductUOMBase):
    """Schema for ProductUOM response."""
    id: int
    product_id: int
    tenant_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
