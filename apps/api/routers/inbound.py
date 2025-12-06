from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas.inbound import (
    InboundOrderResponse,
    InboundShipmentCreate,
    InboundShipmentResponse,
    ShipmentStatusUpdate
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
    """
    List all inbound orders for the authenticated user's tenant.

    All relationships (lines, shipments, products, UOMs) are eagerly loaded
    to prevent N+1 query issues.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        status: Optional filter by order status
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[InboundOrderResponse]: List of inbound orders with all relationships

    Raises:
        401: If user is not authenticated
    """
    service = InboundService(db)
    orders = await service.list_orders(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        status=status
    )
    return [InboundOrderResponse.model_validate(order) for order in orders]


@router.get("/orders/{order_id}", response_model=InboundOrderResponse)
async def get_inbound_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundOrderResponse:
    """
    Get a specific inbound order by ID.

    All relationships (lines, shipments, products, UOMs) are eagerly loaded
    to prevent N+1 query issues.

    Args:
        order_id: ID of the inbound order to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InboundOrderResponse: Inbound order details with all relationships

    Raises:
        401: If user is not authenticated
        404: If order not found or doesn't belong to user's tenant
    """
    service = InboundService(db)
    order = await service.get_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id
    )
    return InboundOrderResponse.model_validate(order)


@router.post("/orders/{order_id}/shipments", response_model=InboundShipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_shipment(
    order_id: int,
    shipment_data: InboundShipmentCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundShipmentResponse:
    """
    Create a new shipment for an inbound order.

    Args:
        order_id: ID of the inbound order
        shipment_data: Shipment creation data
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InboundShipmentResponse: Created shipment

    Raises:
        400: If shipment number already exists
        401: If user is not authenticated
        404: If order not found or doesn't belong to user's tenant
    """
    service = InboundService(db)
    shipment = await service.create_shipment(
        order_id=order_id,
        tenant_id=current_user.tenant_id,
        shipment_number=shipment_data.shipment_number,
        container_number=shipment_data.container_number,
        driver_details=shipment_data.driver_details,
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
    """
    Update the status of a shipment.

    Automatically sets arrival_date when status changes to ARRIVED,
    and closed_date when status changes to CLOSED.

    Args:
        shipment_id: ID of the shipment
        status_data: New status
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InboundShipmentResponse: Updated shipment

    Raises:
        401: If user is not authenticated
        404: If shipment not found or doesn't belong to user's tenant
    """
    service = InboundService(db)
    shipment = await service.update_shipment_status(
        shipment_id=shipment_id,
        status=status_data.status,
        tenant_id=current_user.tenant_id
    )
    return InboundShipmentResponse.model_validate(shipment)
