from datetime import datetime, date
from typing import Optional, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field
from models.inventory import InventoryStatus


class InventoryBase(BaseModel):
    """Base schema for Inventory with common fields."""
    depositor_id: int = Field(..., description="Depositor ID (product owner)")
    product_id: int = Field(..., description="Product ID")
    location_id: int = Field(..., description="Location ID where inventory is stored")
    quantity: Decimal = Field(..., gt=0, description="Quantity (must be positive)")
    status: InventoryStatus = Field(default=InventoryStatus.AVAILABLE, description="Inventory status")
    batch_number: Optional[str] = Field(None, max_length=255, description="Batch/Lot number")
    expiry_date: Optional[date] = Field(None, description="Expiry date (if applicable)")


class InventoryReceiveRequest(BaseModel):
    """Schema for receiving new inventory."""
    depositor_id: int = Field(..., description="Depositor ID (product owner)")
    product_id: int = Field(..., description="Product ID")
    location_id: int = Field(..., description="Destination location ID")
    quantity: Decimal = Field(..., gt=0, description="Quantity to receive")
    lpn: Optional[str] = Field(None, max_length=255, description="License Plate Number (auto-generated if not provided)")
    batch_number: Optional[str] = Field(None, max_length=255, description="Batch/Lot number")
    expiry_date: Optional[date] = Field(None, description="Expiry date")
    reference_doc: Optional[str] = Field(None, max_length=255, description="Reference document (PO number, etc.)")


class InventoryMoveRequest(BaseModel):
    """Schema for moving inventory between locations."""
    lpn: str = Field(..., description="License Plate Number to move")
    to_location_id: int = Field(..., description="Destination location ID")
    quantity: Optional[Decimal] = Field(None, gt=0, description="Quantity to move (if partial, will split LPN)")
    reference_doc: Optional[str] = Field(None, max_length=255, description="Reference document")


class InventoryAdjustRequest(BaseModel):
    """Schema for adjusting inventory quantity."""
    lpn: str = Field(..., description="License Plate Number to adjust")
    quantity: Decimal = Field(..., description="New quantity (can be positive, negative, or zero)")
    reason: str = Field(..., min_length=1, max_length=255, description="Reason for adjustment")
    reference_doc: Optional[str] = Field(None, max_length=255, description="Reference document")


class InventoryStatusChangeRequest(BaseModel):
    """Schema for changing inventory status."""
    lpn: str = Field(..., description="License Plate Number")
    new_status: InventoryStatus = Field(..., description="New status")
    reason: str = Field(..., min_length=1, max_length=255, description="Reason for status change")
    reference_doc: Optional[str] = Field(None, max_length=255, description="Reference document")


class InventoryResponse(BaseModel):
    """Schema for inventory response."""
    id: int
    tenant_id: int
    depositor_id: int
    product_id: int
    location_id: int
    lpn: str
    quantity: Decimal
    allocated_quantity: Decimal = Field(default=Decimal('0'), description="Quantity allocated to outbound orders")
    status: InventoryStatus
    batch_number: Optional[str]
    expiry_date: Optional[date]
    fifo_date: datetime
    created_at: datetime
    updated_at: datetime

    # Computed fields
    available_quantity: Optional[Decimal] = Field(None, description="Available quantity (quantity - allocated_quantity)")

    # Populated fields
    product_sku: Optional[str] = Field(None, description="Product SKU")
    product_name: Optional[str] = Field(None, description="Product name")
    location_name: Optional[str] = Field(None, description="Location name")
    depositor_name: Optional[str] = Field(None, description="Depositor name")

    class Config:
        from_attributes = True


class InventoryListResponse(BaseModel):
    """Schema for paginated inventory list."""
    items: list[InventoryResponse]
    total: int
    skip: int
    limit: int
