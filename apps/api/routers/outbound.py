from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.outbound import (
    OutboundOrderCreate,
    OutboundOrderResponse,
    OutboundOrderListResponse,
    OutboundWaveCreate,
    OutboundWaveResponse,
    OutboundWaveListResponse,
    AllocateOrderRequest,
    AllocateWaveRequest,
    AddOrdersToWaveRequest,
    AllocationStrategyResponse
)
from services.outbound_service import OutboundService
from services.allocation_service import AllocationService
from repositories.allocation_strategy_repository import AllocationStrategyRepository
from auth.dependencies import get_current_user
from models.user import User
from models.outbound_order import OutboundOrderStatus
from models.outbound_wave import OutboundWaveStatus


router = APIRouter(prefix="/api/outbound", tags=["Outbound"])


# ============================================================================
# Allocation Strategies
# ============================================================================

@router.get("/strategies", response_model=List[AllocationStrategyResponse])
async def list_allocation_strategies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    active_only: bool = Query(True, description="Return only active strategies"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[AllocationStrategyResponse]:
    """List all allocation strategies."""
    repo = AllocationStrategyRepository(db)
    strategies = await repo.list_strategies(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        active_only=active_only
    )
    return [AllocationStrategyResponse.model_validate(s) for s in strategies]


@router.get("/strategies/{strategy_id}", response_model=AllocationStrategyResponse)
async def get_allocation_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AllocationStrategyResponse:
    """Get a specific allocation strategy."""
    repo = AllocationStrategyRepository(db)
    strategy = await repo.get_by_id(strategy_id, current_user.tenant_id)
    if not strategy:
        raise HTTPException(status_code=404, detail=f"Strategy {strategy_id} not found")
    return AllocationStrategyResponse.model_validate(strategy)


# ============================================================================
# Orders
# ============================================================================

@router.get("/orders", response_model=List[OutboundOrderListResponse])
async def list_outbound_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[OutboundOrderStatus] = Query(None, description="Filter by status"),
    customer_id: Optional[int] = Query(None, description="Filter by customer"),
    order_type: Optional[str] = Query(None, description="Filter by order type"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[OutboundOrderListResponse]:
    """List all outbound orders."""
    service = OutboundService(db)
    orders = await service.list_orders(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        status=status,
        customer_id=customer_id,
        order_type=order_type
    )
    return [OutboundOrderListResponse.model_validate(order) for order in orders]


@router.post("/orders", response_model=OutboundOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_outbound_order(
    order_data: OutboundOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundOrderResponse:
    """
    Create a new outbound order.

    Validates that all products exist before creating the order.
    """
    service = OutboundService(db)
    order = await service.create_order(
        order_number=order_data.order_number,
        customer_id=order_data.customer_id,
        order_type=order_data.order_type,
        lines=[line.model_dump() for line in order_data.lines],
        tenant_id=current_user.tenant_id,
        priority=order_data.priority,
        requested_delivery_date=order_data.requested_delivery_date,
        shipping_details=order_data.shipping_details,
        notes=order_data.notes,
        created_by=current_user.id
    )
    return OutboundOrderResponse.model_validate(order)


@router.get("/orders/{order_id}", response_model=OutboundOrderResponse)
async def get_outbound_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundOrderResponse:
    """Get a specific outbound order with all details."""
    service = OutboundService(db)
    order = await service.get_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundOrderResponse.model_validate(order)


@router.post("/orders/{order_id}/allocate", response_model=OutboundOrderResponse)
async def allocate_order(
    order_id: int,
    request: AllocateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundOrderResponse:
    """
    Allocate inventory for an order.

    Creates PickTask records and updates order status to PLANNED.
    """
    service = OutboundService(db)
    order = await service.allocate_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id,
        strategy_id=request.strategy_id
    )
    return OutboundOrderResponse.model_validate(order)


@router.post("/orders/{order_id}/release", response_model=OutboundOrderResponse)
async def release_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundOrderResponse:
    """
    Release an order (change status to RELEASED).

    Order must be in PLANNED status.
    """
    service = OutboundService(db)
    order = await service.release_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundOrderResponse.model_validate(order)


@router.post("/orders/{order_id}/cancel", response_model=OutboundOrderResponse)
async def cancel_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundOrderResponse:
    """Cancel an outbound order."""
    service = OutboundService(db)
    order = await service.cancel_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundOrderResponse.model_validate(order)


# ============================================================================
# Waves
# ============================================================================

@router.get("/waves", response_model=List[OutboundWaveListResponse])
async def list_outbound_waves(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[OutboundWaveStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[OutboundWaveListResponse]:
    """List all outbound waves."""
    service = OutboundService(db)
    waves = await service.list_waves(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        status=status
    )
    return [OutboundWaveListResponse.model_validate(wave) for wave in waves]


@router.post("/waves", response_model=OutboundWaveResponse, status_code=status.HTTP_201_CREATED)
async def create_outbound_wave(
    wave_data: OutboundWaveCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """Create a new outbound wave."""
    service = OutboundService(db)
    wave = await service.create_wave(
        wave_number=wave_data.wave_number,
        tenant_id=current_user.tenant_id,
        strategy_id=wave_data.strategy_id,
        order_ids=wave_data.order_ids,
        created_by=current_user.id
    )
    return OutboundWaveResponse.model_validate(wave)


@router.get("/waves/{wave_id}", response_model=OutboundWaveResponse)
async def get_outbound_wave(
    wave_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """Get a specific outbound wave with all details."""
    service = OutboundService(db)
    wave = await service.get_wave(
        wave_id=wave_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundWaveResponse.model_validate(wave)


@router.post("/waves/{wave_id}/orders", response_model=OutboundWaveResponse)
async def add_orders_to_wave(
    wave_id: int,
    request: AddOrdersToWaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """Add orders to an existing wave."""
    service = OutboundService(db)
    wave = await service.add_orders_to_wave(
        wave_id=wave_id,
        order_ids=request.order_ids,
        tenant_id=current_user.tenant_id
    )
    return OutboundWaveResponse.model_validate(wave)


@router.post("/waves/{wave_id}/allocate", response_model=OutboundWaveResponse)
async def allocate_wave(
    wave_id: int,
    request: AllocateWaveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """
    Allocate inventory for all orders in a wave.

    Uses the wave's strategy for allocation.
    Creates PickTask records and updates wave status to ALLOCATED.
    """
    service = OutboundService(db)
    wave = await service.allocate_wave(
        wave_id=wave_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundWaveResponse.model_validate(wave)


@router.post("/waves/{wave_id}/release", response_model=OutboundWaveResponse)
async def release_wave(
    wave_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """
    Release a wave (change status to RELEASED).

    Wave must be in ALLOCATED status.
    """
    service = OutboundService(db)
    wave = await service.release_wave(
        wave_id=wave_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundWaveResponse.model_validate(wave)


# ============================================================================
# Pick Tasks & Shortage Management
# ============================================================================

@router.post("/orders/{order_id}/accept-shortages", response_model=OutboundOrderResponse)
async def accept_order_shortages(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundOrderResponse:
    """
    Accept shortages for an order and release it for picking.

    This allows orders with PARTIAL or SHORT line statuses to proceed.
    The remaining unallocated quantity stays as backorder (not cancelled).

    Order must be in PLANNED or VERIFIED status.
    """
    service = OutboundService(db)
    order = await service.accept_shortages(
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundOrderResponse.model_validate(order)


@router.post("/tasks/{task_id}/complete")
async def complete_pick_task(
    task_id: int,
    qty_picked: float = Query(..., gt=0, description="Quantity picked"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Complete a pick task and update inventory.

    This endpoint:
    - Validates the picked quantity
    - Decreases both quantity and allocated_quantity from inventory
    - Creates audit transaction
    - Updates pick task status to COMPLETED
    - Updates outbound line qty_picked

    Returns inventory status after the pick.
    """
    service = OutboundService(db)
    result = await service.complete_pick_task(
        task_id=task_id,
        qty_picked=qty_picked,
        tenant_id=current_user.tenant_id
    )
    return result
