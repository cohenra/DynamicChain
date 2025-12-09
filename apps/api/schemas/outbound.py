from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field

from models.outbound_order import OutboundOrderStatus
from models.outbound_wave import OutboundWaveStatus
from models.pick_task import PickTaskStatus
from models.allocation_strategy import PickingType


# ============================================================================
# Helper Schemas for Nested Objects
# ============================================================================

class OutboundProductSummary(BaseModel):
    """Minimal product info for outbound responses."""
    id: int
    sku: str
    name: str

    class Config:
        from_attributes = True


class OutboundUomSummary(BaseModel):
    """Minimal UOM info for outbound responses."""
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class OutboundCustomerSummary(BaseModel):
    """Minimal Customer/Depositor info."""
    id: int
    name: str
    code: str

    class Config:
        from_attributes = True


class LocationSummary(BaseModel):
    """Minimal location info."""
    id: int
    name: str
    warehouse_id: int

    class Config:
        from_attributes = True


# ============================================================================
# Allocation Strategy Schemas
# ============================================================================

class AllocationStrategyResponse(BaseModel):
    """Schema for allocation strategy response."""
    id: int
    tenant_id: int
    name: str
    picking_type: PickingType
    rules_config: Dict[str, Any]
    is_active: bool
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Outbound Line Schemas
# ============================================================================

class OutboundLineCreate(BaseModel):
    """Schema for creating an outbound line."""
    product_id: int
    uom_id: int
    qty_ordered: Decimal = Field(..., gt=0)
    constraints: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None


class OutboundLineResponse(BaseModel):
    """Schema for outbound line response."""
    id: int
    order_id: int
    product_id: int
    uom_id: int
    qty_ordered: Decimal
    qty_allocated: Decimal
    qty_picked: Decimal
    qty_packed: Decimal
    qty_shipped: Decimal
    constraints: Optional[Dict[str, Any]] = {}
    line_status: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Relationships
    product: Optional[OutboundProductSummary] = None
    uom: Optional[OutboundUomSummary] = None

    class Config:
        from_attributes = True


# ============================================================================
# Pick Task Schemas
# ============================================================================

class PickTaskResponse(BaseModel):
    """Schema for pick task response."""
    id: int
    wave_id: Optional[int] = None
    order_id: int
    line_id: int
    inventory_id: int
    from_location_id: int
    to_location_id: Optional[int] = None
    qty_to_pick: Decimal
    qty_picked: Decimal
    status: PickTaskStatus
    assigned_to_user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Relationships
    from_location: Optional[LocationSummary] = None
    to_location: Optional[LocationSummary] = None

    class Config:
        from_attributes = True


# ============================================================================
# Outbound Order Schemas
# ============================================================================

class OutboundOrderCreate(BaseModel):
    """Schema for creating an outbound order."""
    order_number: str = Field(..., max_length=50)
    customer_id: int
    order_type: str = Field(..., max_length=50)
    priority: int = Field(default=5, ge=1, le=10)
    requested_delivery_date: Optional[date] = None
    shipping_details: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None
    lines: List[OutboundLineCreate]


class OutboundOrderResponse(BaseModel):
    """Schema for outbound order response."""
    id: int
    tenant_id: int
    order_number: str
    customer_id: int
    wave_id: Optional[int] = None
    status: OutboundOrderStatus
    order_type: str
    priority: int
    requested_delivery_date: Optional[date] = None
    status_changed_at: Optional[datetime] = None
    shipping_details: Optional[Dict[str, Any]] = {}
    metrics: Optional[Dict[str, Any]] = {}
    notes: Optional[str] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Relationships
    customer: Optional[OutboundCustomerSummary] = None
    lines: List[OutboundLineResponse] = []
    pick_tasks: List[PickTaskResponse] = []

    class Config:
        from_attributes = True


class OutboundOrderListResponse(BaseModel):
    """Schema for outbound order list response with lines for expanded view."""
    id: int
    order_number: str
    customer_id: int
    status: OutboundOrderStatus
    order_type: str
    priority: int
    requested_delivery_date: Optional[date] = None
    created_at: datetime

    # Relationships
    customer: Optional[OutboundCustomerSummary] = None
    lines: List[OutboundLineResponse] = []

    class Config:
        from_attributes = True


# ============================================================================
# Outbound Wave Schemas
# ============================================================================

class OutboundWaveCreate(BaseModel):
    """Schema for creating an outbound wave."""
    wave_number: Optional[str] = Field(None, max_length=50)
    strategy_id: Optional[int] = None
    order_ids: Optional[List[int]] = []


class OutboundWaveResponse(BaseModel):
    """Schema for outbound wave response."""
    id: int
    tenant_id: int
    wave_number: str
    status: OutboundWaveStatus
    strategy_id: Optional[int] = None
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Relationships
    orders: List[OutboundOrderListResponse] = []
    pick_tasks: List[PickTaskResponse] = []

    class Config:
        from_attributes = True


class OutboundWaveListResponse(BaseModel):
    """Schema for outbound wave list response (minimal)."""
    id: int
    wave_number: str
    status: OutboundWaveStatus
    strategy_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Action Schemas
# ============================================================================

class AllocateOrderRequest(BaseModel):
    """Request to allocate an order."""
    strategy_id: Optional[int] = None


class AllocateWaveRequest(BaseModel):
    """Request to allocate a wave."""
    pass  # Uses wave's strategy_id


class AddOrdersToWaveRequest(BaseModel):
    """Request to add orders to a wave."""
    order_ids: List[int]
