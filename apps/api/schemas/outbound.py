from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator
from models.outbound_order import OutboundOrderStatus, OrderType, OrderPriority
from models.outbound_wave import OutboundWaveStatus
from models.allocation_strategy import WaveType

# --- Helper Schemas (New - Fixes Validation Error) ---

class ProductSimple(BaseModel):
    id: int
    sku: str
    name: str
    
    class Config:
        from_attributes = True

class CustomerSimple(BaseModel):
    id: int
    name: str
    code: str
    
    class Config:
        from_attributes = True

class LocationSimple(BaseModel):
    id: int
    name: str
    
    class Config:
        from_attributes = True

# --- Shared Schemas ---

class OutboundLineBase(BaseModel):
    product_id: int
    uom_id: int
    qty_ordered: float
    constraints: Optional[Dict[str, Any]] = None

class OutboundLineCreate(OutboundLineBase):
    pass

class OutboundLineResponse(OutboundLineBase):
    id: int
    qty_allocated: float
    qty_picked: float
    line_status: str
    product: Optional[ProductSimple] = None  # FIX: Use Schema instead of Dict

    class Config:
        from_attributes = True

# --- Order Schemas ---

class OutboundOrderCreate(BaseModel):
    order_number: str = Field(..., min_length=1, max_length=50)
    customer_id: int
    order_type: OrderType = OrderType.CUSTOMER_ORDER
    priority: OrderPriority = OrderPriority.MEDIUM
    requested_delivery_date: date
    shipping_details: Optional[Dict[str, Any]] = None
    lines: List[OutboundLineCreate]

class OutboundOrderResponse(BaseModel):
    id: int
    tenant_id: int
    order_number: str
    customer_id: int
    status: OutboundOrderStatus
    order_type: OrderType
    priority: OrderPriority
    requested_delivery_date: Optional[date] = None
    wave_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    customer: Optional[CustomerSimple] = None # FIX: Use Schema instead of Dict
    lines: List[OutboundLineResponse] = []

    class Config:
        from_attributes = True

class OutboundOrderListResponse(BaseModel):
    id: int
    order_number: str
    customer_id: int
    status: OutboundOrderStatus
    order_type: OrderType
    priority: OrderPriority
    requested_delivery_date: Optional[date] = None
    wave_id: Optional[int] = None
    customer: Optional[CustomerSimple] = None # FIX: Use Schema instead of Dict
    
    class Config:
        from_attributes = True

# --- Wave Schemas ---

class OutboundOrderSummary(BaseModel):
    """Simplified order view for wave listing."""
    id: int
    order_number: str
    customer_id: int
    status: OutboundOrderStatus
    requested_delivery_date: Optional[date] = None
    customer: Optional[CustomerSimple] = None # FIX: Use Schema instead of Dict
    lines: List[OutboundLineResponse] = [] 

    class Config:
        from_attributes = True

class OutboundWaveBase(BaseModel):
    wave_number: Optional[str] = None
    strategy_id: int

class OutboundWaveCreate(OutboundWaveBase):
    order_ids: Optional[List[int]] = None

class OutboundWaveResponse(OutboundWaveBase):
    id: int
    tenant_id: int
    status: OutboundWaveStatus
    created_at: datetime
    updated_at: datetime
    metrics: Optional[Dict[str, Any]] = None
    created_by: Optional[int] = None
    
    orders: List[OutboundOrderSummary] = []

    class Config:
        from_attributes = True

class OutboundWaveListResponse(OutboundWaveResponse):
    pass

# --- Action Request Schemas ---

class AllocateOrderRequest(BaseModel):
    strategy_id: int

class AllocateWaveRequest(BaseModel):
    pass

class AddOrdersToWaveRequest(BaseModel):
    order_ids: List[int]

# --- Strategy Schemas ---

class AllocationStrategyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    wave_type: Optional[WaveType] = None
    is_active: bool
    rules_config: Dict[str, Any]

    class Config:
        from_attributes = True

class WaveTypeOption(BaseModel):
    wave_type: str
    strategy_id: int
    strategy_name: str
    description: Optional[str] = None
    picking_policy: Optional[str] = None

# --- Simulation Schemas ---

class WaveSimulationCriteria(BaseModel):
    delivery_date_from: Optional[date] = None
    delivery_date_to: Optional[date] = None
    customer_id: Optional[int] = None
    order_type: Optional[OrderType] = None
    priority: Optional[OrderPriority] = None

class WaveSimulationRequest(BaseModel):
    wave_type: WaveType
    criteria: WaveSimulationCriteria

class OrderSimulationSummary(BaseModel):
    id: int
    order_number: str
    customer_name: str
    order_type: str
    priority: str
    requested_delivery_date: Optional[date] = None
    lines_count: int
    total_qty: float

class WaveSimulationResponse(BaseModel):
    matched_orders_count: int
    total_lines: int
    total_qty: float
    orders: List[OrderSimulationSummary]
    resolved_strategy_id: int
    resolved_strategy_name: str
    wave_type: WaveType

class CreateWaveWithCriteriaRequest(BaseModel):
    wave_type: WaveType
    criteria: WaveSimulationCriteria
    order_ids: Optional[List[int]] = None
    wave_name: Optional[str] = None

# --- Pick Task Response ---

class PickTaskResponse(BaseModel):
    id: int
    wave_id: Optional[int]
    order_id: int
    line_id: int
    inventory_id: int
    from_location_id: int
    to_location_id: Optional[int]
    qty_to_pick: float
    qty_picked: float
    status: str
    task_number: Optional[str] = Field(default_factory=lambda: "TASK-000")
    
    # Relationships (FIX: Use Schema instead of Dict)
    product: Optional[ProductSimple] = None 
    from_location: Optional[LocationSimple] = None
    to_location: Optional[LocationSimple] = None

    class Config:
        from_attributes = True
        
    @field_validator('task_number', mode='before')
    def set_task_number(cls, v, info):
        # Generate a task number from ID if not present in DB model
        if v: return v
        if info.data.get('id'): return f"TSK-{info.data.get('id'):06d}"
        return "TSK-NEW"