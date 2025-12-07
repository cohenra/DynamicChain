from typing import List, Optional
# --- התיקון: הוספת HTTPException לרשימה ---
from fastapi import APIRouter, Depends, status, Query, HTTPException 
from sqlalchemy.ext.asyncio import AsyncSession
# ... שאר האימפורטים נשארים אותו דבר

from database import get_db
from schemas.inbound import (
    InboundOrderResponse,
    InboundShipmentCreate,
    InboundShipmentResponse,
    ShipmentStatusUpdate,
    InboundOrderCreateRequest,
    InboundLineCreate,
    InboundLineUpdate,
    InboundLineResponse,
    BulkCloseRequest,
    BulkCloseResult,
    ReceiveShipmentItemRequest
)
from services.inbound_service import InboundService
from auth.dependencies import get_current_user
from models.user import User
from models.inbound_order import InboundOrderStatus


router = APIRouter(prefix="/api/inbound", tags=["Inbound"])


@router.get("/orders", response_model=List[InboundOrderResponse])
async def list_inbound_orders(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status: Optional[InboundOrderStatus] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[InboundOrderResponse]:
    service = InboundService(db)
    orders = await service.list_orders(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        status=status
    )
    return [InboundOrderResponse.model_validate(order) for order in orders]


@router.post("/orders", response_model=InboundOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_inbound_order(
    order_data: InboundOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundOrderResponse:
    service = InboundService(db)
    order = await service.create_order(
        order_data=order_data,
        tenant_id=current_user.tenant_id
    )
    return InboundOrderResponse.model_validate(order)


@router.get("/orders/{order_id}", response_model=InboundOrderResponse)
async def get_inbound_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundOrderResponse:
    service = InboundService(db)
    order = await service.get_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return InboundOrderResponse.model_validate(order)

@router.patch("/orders/{order_id}/close", response_model=InboundOrderResponse)
async def close_inbound_order(
    order_id: int,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundOrderResponse:
    """
    Close an order with business validation.

    Args:
        order_id: ID of the order to close
        force: If True, allow closing even if nothing was received (will set status to CANCELLED)
        current_user: Authenticated user
        db: Database session

    Returns:
        InboundOrderResponse: The closed order

    Raises:
        400: If no items received and force=False
    """
    service = InboundService(db)
    order = await service.close_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id,
        force=force
    )
    return InboundOrderResponse.model_validate(order)

@router.post("/orders/{order_id}/lines", response_model=InboundOrderResponse)
async def add_line_to_order(
    order_id: int,
    line_data: InboundLineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundOrderResponse:
    """Add a line to an existing order."""
    service = InboundService(db)
    order = await service.add_line_to_order(
        order_id=order_id,
        line_data=line_data,
        tenant_id=current_user.tenant_id
    )
    return InboundOrderResponse.model_validate(order)

@router.patch("/lines/{line_id}", response_model=InboundLineResponse)
async def update_inbound_line(
    line_id: int,
    line_data: InboundLineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundLineResponse:
    """Update an existing line."""
    service = InboundService(db)
    line = await service.update_line(
        line_id=line_id,
        line_data=line_data,
        tenant_id=current_user.tenant_id
    )
    return InboundLineResponse.model_validate(line)

@router.post("/orders/{order_id}/shipments", response_model=InboundShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    order_id: int,
    shipment_data: InboundShipmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundShipmentResponse:
    service = InboundService(db)
    shipment = await service.create_shipment(
        order_id=order_id,
        tenant_id=current_user.tenant_id,
        shipment_number=shipment_data.shipment_number,
        container_number=shipment_data.container_number,
        driver_details=shipment_data.driver_details,
        arrival_date=shipment_data.arrival_date,
        notes=shipment_data.notes
    )
    return InboundShipmentResponse.model_validate(shipment)


@router.patch("/shipments/{shipment_id}/status", response_model=InboundShipmentResponse)
async def update_shipment_status(
    shipment_id: int,
    status_data: ShipmentStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundShipmentResponse:
    service = InboundService(db)
    shipment = await service.update_shipment_status(
        shipment_id=shipment_id,
        status=status_data.status,
        tenant_id=current_user.tenant_id
    )
    return InboundShipmentResponse.model_validate(shipment)


@router.post("/orders/bulk-close", response_model=BulkCloseResult)
async def bulk_close_orders(
    bulk_data: BulkCloseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> BulkCloseResult:
    """
    Close multiple orders at once.
    Automatically forces closure (Cancellation) for empty/draft orders.
    """
    service = InboundService(db)
    success_count = 0
    failed_count = 0
    errors = []
    closed_order_ids = []

    for order_id in bulk_data.order_ids:
        try:
            # שלב 1: נסה לסגור רגיל
            await service.close_order(
                order_id=order_id,
                tenant_id=current_user.tenant_id,
                force=False
            )
            success_count += 1
            closed_order_ids.append(order_id)
        except HTTPException as e:
            # שלב 2: אם נכשל כי אין פריטים (400) - נסה לסגור בכוח (ביטול)
            if e.status_code == 400 and "Use force=True" in str(e.detail):
                try:
                    await service.close_order(
                        order_id=order_id,
                        tenant_id=current_user.tenant_id,
                        force=True # Force close empty orders in bulk
                    )
                    success_count += 1
                    closed_order_ids.append(order_id)
                except Exception as inner_e:
                    failed_count += 1
                    errors.append(f"Order {order_id} (Force): {str(inner_e)}")
            else:
                failed_count += 1
                errors.append(f"Order {order_id}: {str(e.detail)}")
        except Exception as e:
            failed_count += 1
            errors.append(f"Order {order_id}: {str(e)}")

    return BulkCloseResult(
        success_count=success_count,
        failed_count=failed_count,
        errors=errors,
        closed_order_ids=closed_order_ids
    )


@router.post("/shipments/{shipment_id}/receive", response_model=InboundShipmentResponse)
async def receive_shipment_item(
    shipment_id: int,
    receive_data: ReceiveShipmentItemRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundShipmentResponse:
    """
    Receive an item from a shipment.

    This endpoint:
    - Creates inventory record with the received item
    - Links the transaction to the shipment for traceability
    - Updates the inbound line received quantity
    - Changes shipment status from SCHEDULED to RECEIVING if needed

    Args:
        shipment_id: ID of the shipment
        receive_data: Receiving data (line, location, quantity, etc.)
        current_user: Authenticated user
        db: Database session

    Returns:
        InboundShipmentResponse: The updated shipment
    """
    service = InboundService(db)
    shipment = await service.receive_shipment_item(
        shipment_id=shipment_id,
        receive_data=receive_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )
    return InboundShipmentResponse.model_validate(shipment)