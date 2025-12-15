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
    AllocationStrategyResponse,
    WaveSimulationRequest,
    WaveSimulationResponse,
    CreateWaveWithCriteriaRequest,
    WaveTypeOption,
    PickTaskResponse  # Ensure this is imported or defined in schemas
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
# Wave Types (for Wave Wizard)
# ============================================================================

@router.get("/wave-types", response_model=List[WaveTypeOption])
async def list_wave_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[WaveTypeOption]:
    """
    List available wave types with their associated strategies.
    Used by the Create Wave Wizard to populate the Wave Type dropdown.
    """
    service = OutboundService(db)
    strategies = await service.get_available_wave_types(current_user.tenant_id)

    return [
        WaveTypeOption(
            wave_type=s.wave_type,
            strategy_id=s.id,
            strategy_name=s.name,
            description=s.description,
            picking_policy=s.rules_config.get("picking_policy") if s.rules_config else None
        )
        for s in strategies if s.wave_type
    ]


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
    """
    service = OutboundService(db)
    order = await service.create_order(
        order_data=order_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
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


@router.post("/waves/simulate", response_model=WaveSimulationResponse)
async def simulate_wave(
    request: WaveSimulationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WaveSimulationResponse:
    """
    Simulate wave creation - preview matched orders and resolved strategy.
    """
    service = OutboundService(db)
    return await service.simulate_wave(
        wave_type=request.wave_type,
        criteria=request.criteria,
        tenant_id=current_user.tenant_id
    )


@router.post("/waves/wizard", response_model=OutboundWaveResponse, status_code=status.HTTP_201_CREATED)
async def create_wave_wizard(
    request: CreateWaveWithCriteriaRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """
    Create a new wave using the wizard with auto-strategy mapping.
    """
    service = OutboundService(db)
    wave = await service.create_wave_with_criteria(
        request=request,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )
    return OutboundWaveResponse.model_validate(wave)


@router.post("/waves", response_model=OutboundWaveResponse, status_code=status.HTTP_201_CREATED)
async def create_outbound_wave(
    wave_data: OutboundWaveCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """Create a new outbound wave (legacy endpoint)."""
    service = OutboundService(db)
    wave = await service.create_wave(
        wave_data=wave_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
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
    """
    service = OutboundService(db)
    wave = await service.release_wave(
        wave_id=wave_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundWaveResponse.model_validate(wave)


# FIX: Added Endpoint for fetching Wave Tasks
@router.get("/waves/{wave_id}/tasks", response_model=List[PickTaskResponse])
async def get_wave_tasks(
    wave_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[PickTaskResponse]:
    """
    Get all pick tasks associated with a specific wave.
    """
    service = OutboundService(db)
    tasks = await service.get_wave_tasks(
        wave_id=wave_id,
        tenant_id=current_user.tenant_id
    )
    # Using model_validate allows Pydantic to extract data from ORM models
    return [PickTaskResponse.model_validate(task) for task in tasks]


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
    """
    service = OutboundService(db)
    result = await service.complete_pick_task(
        task_id=task_id,
        qty_picked=qty_picked,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )
    return result
    
    # ... (Keep all existing imports and code) ...

# ADD THIS ENDPOINT:
@router.delete("/waves/{wave_id}/orders/{order_id}", response_model=OutboundWaveResponse)
async def remove_order_from_wave(
    wave_id: int,
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OutboundWaveResponse:
    """Remove an order from a wave."""
    service = OutboundService(db)
    wave = await service.remove_order_from_wave(
        wave_id=wave_id,
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return OutboundWaveResponse.model_validate(wave)