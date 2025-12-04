from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.inbound import (
    InboundOrderCreate,
    InboundOrderResponse,
    InboundShipmentCreate,
    InboundShipmentResponse,
    ReceiveShipmentInput,
    ReceiveShipmentResponse
)
from services.inbound_service import InboundService
from auth.dependencies import get_current_user
from models.user import User
from models.inbound_order import InboundOrderStatus


router = APIRouter(prefix="/api/inbound", tags=["Inbound"])


@router.post("/orders", response_model=InboundOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_inbound_order(
    order_data: InboundOrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InboundOrderResponse:
    """
    Create a new inbound order (PO, ASN, Customer Return, or Transfer In).

    Creates an inbound order with lines for the authenticated user's tenant.
    Order number must be unique per tenant.

    The order represents the "plan" for bringing goods into the warehouse.
    After creating an order, you can:
    1. Create shipments (containers/trucks) for the order
    2. Receive items from those shipments

    Args:
        order_data: Order creation data including type, lines, and metadata
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InboundOrderResponse: Created order with all lines

    Raises:
        400: If order number already exists or validation fails
        401: If user is not authenticated
        404: If referenced products, customer, or UOMs not found
    """
    inbound_service = InboundService(db)
    order = await inbound_service.create_order(
        order_data=order_data,
        tenant_id=current_user.tenant_id
    )
    return InboundOrderResponse.model_validate(order)


@router.get("/orders", response_model=List[InboundOrderResponse])
async def list_inbound_orders(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    status_filter: Optional[InboundOrderStatus] = Query(None, description="Filter by order status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[InboundOrderResponse]:
    """
    List all inbound orders for the authenticated user's tenant.

    Supports pagination and optional status filtering.
    Each order includes its lines (expected vs received quantities).

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        status_filter: Optional status filter (DRAFT, CONFIRMED, PARTIALLY_RECEIVED, COMPLETED, CANCELLED)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[InboundOrderResponse]: List of inbound orders with lines

    Raises:
        401: If user is not authenticated
    """
    inbound_service = InboundService(db)
    orders = await inbound_service.list_orders(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        status=status_filter
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

    Retrieves order details with lines and tenant isolation.
    Users can only access orders belonging to their tenant.

    Args:
        order_id: ID of the inbound order to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InboundOrderResponse: Order details with lines

    Raises:
        401: If user is not authenticated
        404: If order not found or doesn't belong to user's tenant
    """
    inbound_service = InboundService(db)
    order = await inbound_service.get_order(
        order_id=order_id,
        tenant_id=current_user.tenant_id,
        load_lines=True,
        load_shipments=True
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
    Create a new shipment (container/truck) for an existing inbound order.

    A single inbound order can have multiple shipments, allowing for:
    - Partial deliveries spread across multiple containers
    - Tracking specific truck arrivals
    - Complex logistics scenarios (e.g., one PO split into 3 containers)

    Args:
        order_id: ID of the parent inbound order
        shipment_data: Shipment creation data (number, driver details, arrival date)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InboundShipmentResponse: Created shipment

    Raises:
        400: If shipment number already exists or order is cancelled
        401: If user is not authenticated
        404: If order not found or doesn't belong to user's tenant
    """
    inbound_service = InboundService(db)
    shipment = await inbound_service.create_shipment(
        order_id=order_id,
        shipment_data=shipment_data,
        tenant_id=current_user.tenant_id
    )
    return InboundShipmentResponse.model_validate(shipment)


@router.post("/receive", response_model=ReceiveShipmentResponse)
async def receive_shipment_items(
    receive_data: ReceiveShipmentInput,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ReceiveShipmentResponse:
    """
    Receive items from a shipment into physical inventory.

    This is the core execution endpoint for the receiving process. It:
    1. Validates the shipment exists and belongs to the tenant's order
    2. For each item received:
       - Creates physical inventory stock (via InventoryService)
       - Updates the inbound_line.received_quantity
       - Links the inventory transaction to the shipment
    3. Auto-updates order status:
       - PARTIALLY_RECEIVED: Some items received
       - COMPLETED: All items fully received
    4. Closes shipment when complete

    Over-receiving protection:
    - Blocks receiving more than expected quantity
    - Returns validation error with details

    Args:
        receive_data: Shipment ID and list of items being received
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ReceiveShipmentResponse: Summary of received items and updated statuses

    Raises:
        400: If over-receiving detected, shipment closed, or order cancelled
        401: If user is not authenticated
        404: If shipment, order, or products not found

    Example:
        ```json
        {
            "shipment_id": 123,
            "items": [
                {
                    "product_id": 456,
                    "quantity": 100,
                    "location_id": 789,
                    "lpn": "LPN-CONTAINER-001-A",
                    "batch_number": "BATCH-2024-001",
                    "expiry_date": "2025-12-31"
                }
            ]
        }
        ```
    """
    inbound_service = InboundService(db)
    result = await inbound_service.receive_shipment_items(
        receive_data=receive_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )
    return result
