from datetime import datetime, date
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field

from models.inbound_order import InboundOrderType, InboundOrderStatus
from models.inbound_shipment import InboundShipmentStatus


# ============================================================================
# Helper Schemas for Nested Objects
# ============================================================================

class InboundProductSummary(BaseModel):
    """Minimal product info for inbound responses."""
    id: int
    sku: str
    name: str
    
    class Config:
        from_attributes = True

class InboundUomSummary(BaseModel):
    """Minimal UOM info for inbound responses."""
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True

class InboundCustomerSummary(BaseModel):
    """Minimal Customer/Depositor info."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


# ============================================================================
# Inbound Shipment Schemas
# ============================================================================

class InboundShipmentBase(BaseModel):
    """Base schema for InboundShipment."""
    shipment_number: str = Field(..., max_length=50)
    container_number: Optional[str] = Field(None, max_length=50)
    driver_details: Optional[str] = None
    notes: Optional[str] = None


class InboundShipmentCreate(BaseModel):
    """Schema for creating a new shipment."""
    shipment_number: str = Field(..., max_length=50)
    container_number: Optional[str] = Field(None, max_length=50)
    driver_details: Optional[str] = None
    arrival_date: Optional[datetime] = None
    notes: Optional[str] = None


class InboundShipmentResponse(InboundShipmentBase):
    """Schema for shipment response."""
    id: int
    inbound_order_id: int
    status: InboundShipmentStatus
    arrival_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Inbound Line Schemas
# ============================================================================

class InboundLineBase(BaseModel):
    """Base schema for InboundLine."""
    product_id: int
    uom_id: int
    expected_quantity: Decimal
    expected_batch: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

class InboundLineCreate(InboundLineBase):
    """Schema for creating a line item within an order."""
    pass

class InboundLineUpdate(BaseModel):
    """Schema for updating a line item."""
    expected_quantity: Optional[Decimal] = None
    expected_batch: Optional[str] = None
    notes: Optional[str] = None

class InboundLineResponse(InboundLineBase):
    """Schema for line response."""
    id: int
    inbound_order_id: int
    received_quantity: Decimal
    created_at: datetime
    updated_at: datetime

    # Nested objects
    product: Optional[InboundProductSummary] = None
    uom: Optional[InboundUomSummary] = None

    class Config:
        from_attributes = True


# ============================================================================
# Inbound Order Schemas
# ============================================================================

class InboundOrderBase(BaseModel):
    """Base schema for InboundOrder."""
    order_number: str = Field(..., max_length=50)
    order_type: InboundOrderType
    supplier_name: Optional[str] = Field(None, max_length=200)
    
    # --- תיקון: החזרנו ל-Optional כדי לתמוך בנתונים קיימים ב-DB ---
    customer_id: Optional[int] = Field(None, description="Depositor ID")
    
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None


class InboundOrderCreate(InboundOrderBase):
    """Schema for creating a new inbound order (Header only)."""
    pass

class InboundOrderCreateRequest(InboundOrderBase):
    """Schema for creating a full order with lines."""
    # --- תיקון: כאן אנחנו דורשים את השדה כחובה ביצירה חדשה ---
    customer_id: int 
    lines: List[InboundLineCreate]


class InboundOrderUpdate(BaseModel):
    """Schema for updating an inbound order."""
    order_type: Optional[InboundOrderType] = None
    status: Optional[InboundOrderStatus] = None
    supplier_name: Optional[str] = Field(None, max_length=200)
    expected_delivery_date: Optional[date] = None
    notes: Optional[str] = None


class InboundOrderResponse(InboundOrderBase):
    """Schema for inbound order response."""
    id: int
    tenant_id: int
    status: InboundOrderStatus
    linked_outbound_order_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Nested collections (loaded via eager loading)
    lines: List[InboundLineResponse] = []
    shipments: List[InboundShipmentResponse] = []
    customer: Optional[InboundCustomerSummary] = None

    class Config:
        from_attributes = True


# ============================================================================
# Request/Response Schemas
# ============================================================================

class InboundOrderListResponse(BaseModel):
    """Response for list of inbound orders."""
    orders: List[InboundOrderResponse]
    total: int


class ShipmentStatusUpdate(BaseModel):
    """Schema for updating shipment status."""
    status: InboundShipmentStatus


class BulkCloseRequest(BaseModel):
    """Schema for bulk closing orders."""
    order_ids: List[int] = Field(..., min_items=1, description="List of order IDs to close")


class BulkCloseResult(BaseModel):
    """Schema for bulk close results."""
    success_count: int
    failed_count: int
    errors: List[str]
    closed_order_ids: List[int]