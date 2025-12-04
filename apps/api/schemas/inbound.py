from datetime import datetime, date
from typing import Dict, Any, Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field
from models.inbound_order import InboundOrderType, InboundOrderStatus
from models.inbound_shipment import InboundShipmentStatus


# ============================================================
# Inbound Line Schemas
# ============================================================

class InboundLineBase(BaseModel):
    """Base schema for Inbound Line with common fields."""
    product_id: int = Field(..., description="Product ID")
    uom_id: int = Field(..., description="Unit of Measure ID")
    expected_quantity: Decimal = Field(..., gt=0, description="Expected quantity to receive")
    expected_batch: Optional[str] = Field(None, max_length=255, description="Expected batch number")
    notes: Optional[str] = Field(None, description="Additional notes")


class InboundLineCreate(InboundLineBase):
    """Schema for creating a new inbound line."""
    pass


class InboundLineUpdate(BaseModel):
    """Schema for updating an existing inbound line."""
    product_id: Optional[int] = None
    uom_id: Optional[int] = None
    expected_quantity: Optional[Decimal] = Field(None, gt=0)
    expected_batch: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class InboundLineResponse(InboundLineBase):
    """Schema for inbound line response."""
    id: int
    inbound_order_id: int
    received_quantity: Decimal
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Inbound Order Schemas
# ============================================================

class InboundOrderBase(BaseModel):
    """Base schema for Inbound Order with common fields."""
    order_number: str = Field(..., min_length=1, max_length=100, description="Order number (unique per tenant)")
    order_type: InboundOrderType = Field(..., description="Order type (PURCHASE_ORDER, ASN, CUSTOMER_RETURN, TRANSFER_IN)")
    supplier_name: Optional[str] = Field(None, max_length=255, description="Supplier name (for POs)")
    customer_id: Optional[int] = Field(None, description="Customer/Depositor ID (for returns)")
    linked_outbound_order_id: Optional[int] = Field(None, description="Linked outbound order ID (for validating returns)")
    expected_delivery_date: Optional[date] = Field(None, description="Expected delivery date")
    notes: Optional[str] = Field(None, description="Additional notes")


class InboundOrderCreate(InboundOrderBase):
    """Schema for creating a new inbound order with lines."""
    lines: List[InboundLineCreate] = Field(..., min_length=1, description="Order lines")


class InboundOrderUpdate(BaseModel):
    """Schema for updating an existing inbound order."""
    order_number: Optional[str] = Field(None, min_length=1, max_length=100)
    order_type: Optional[InboundOrderType] = None
    status: Optional[InboundOrderStatus] = None
    supplier_name: Optional[str] = Field(None, max_length=255)
    customer_id: Optional[int] = None
    linked_outbound_order_id: Optional[int] = None
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None


class InboundOrderResponse(InboundOrderBase):
    """Schema for inbound order response."""
    id: int
    tenant_id: int
    status: InboundOrderStatus
    created_at: datetime
    updated_at: datetime
    lines: List[InboundLineResponse] = Field(default_factory=list, description="Order lines")

    class Config:
        from_attributes = True


# ============================================================
# Inbound Shipment Schemas
# ============================================================

class InboundShipmentBase(BaseModel):
    """Base schema for Inbound Shipment with common fields."""
    shipment_number: str = Field(..., min_length=1, max_length=100, description="Shipment/Container number")
    driver_details: Optional[Dict[str, Any]] = Field(None, description="Driver and logistics details")
    arrival_date: Optional[datetime] = Field(None, description="Actual arrival date/time")
    notes: Optional[str] = Field(None, description="Additional notes")


class InboundShipmentCreate(InboundShipmentBase):
    """Schema for creating a new inbound shipment."""
    pass


class InboundShipmentUpdate(BaseModel):
    """Schema for updating an existing inbound shipment."""
    shipment_number: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[InboundShipmentStatus] = None
    driver_details: Optional[Dict[str, Any]] = None
    arrival_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    notes: Optional[str] = None


class InboundShipmentResponse(InboundShipmentBase):
    """Schema for inbound shipment response."""
    id: int
    inbound_order_id: int
    status: InboundShipmentStatus
    closed_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# Receiving Execution Schemas
# ============================================================

class ReceiveItemInput(BaseModel):
    """Schema for a single item being received."""
    product_id: int = Field(..., description="Product ID")
    quantity: Decimal = Field(..., gt=0, description="Quantity being received")
    location_id: int = Field(..., description="Location ID where stock is received")
    lpn: str = Field(..., min_length=1, max_length=255, description="License Plate Number")
    batch_number: Optional[str] = Field(None, max_length=255, description="Batch number")
    expiry_date: Optional[date] = Field(None, description="Expiry date")
    status: Optional[str] = Field("AVAILABLE", max_length=50, description="Inventory status")


class ReceiveShipmentInput(BaseModel):
    """Schema for receiving items from a shipment."""
    shipment_id: int = Field(..., description="Inbound shipment ID")
    items: List[ReceiveItemInput] = Field(..., min_length=1, description="Items being received")


class ReceiveShipmentResponse(BaseModel):
    """Schema for receive shipment response."""
    shipment_id: int
    order_id: int
    received_items: int
    message: str
    order_status: InboundOrderStatus
    shipment_status: InboundShipmentStatus
