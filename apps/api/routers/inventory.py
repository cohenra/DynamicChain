from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.inventory import (
    InventoryReceiveRequest,
    InventoryMoveRequest,
    InventoryAdjustRequest,
    InventoryResponse,
    InventoryListResponse
)
from schemas.inventory_transaction import InventoryTransactionResponse, InventoryTransactionListResponse
from services.inventory_service import InventoryService
from repositories.inventory_transaction_repository import InventoryTransactionRepository
from auth.dependencies import get_current_user
from models.user import User
from models.inventory import InventoryStatus


router = APIRouter(prefix="/api/inventory", tags=["Inventory"])


@router.post("/receive", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
async def receive_stock(
    receive_data: InventoryReceiveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    """
    Receive new stock into the warehouse.

    This endpoint creates a new inventory record (LPN) and logs an INBOUND_RECEIVE transaction.
    The LPN can be provided or will be auto-generated if not specified.

    **CRITICAL for Billing:** Sets the FIFO date to now, which persists through moves and splits.

    Args:
        receive_data: Stock receiving data including product, location, quantity, and optional batch info
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryResponse: Created inventory record with generated or provided LPN

    Raises:
        400: If LPN already exists, or product/location/depositor not found
        401: If user is not authenticated
        404: If product, location, or depositor not found

    Example:
        ```json
        {
          "depositor_id": 1,
          "product_id": 5,
          "location_id": 10,
          "quantity": 100.50,
          "lpn": "PALLET-001",  // Optional
          "batch_number": "BATCH-2024-001",  // Optional
          "expiry_date": "2025-12-31",  // Optional
          "reference_doc": "PO-12345"  // Optional
        }
        ```
    """
    inventory_service = InventoryService(db)
    inventory = await inventory_service.receive_stock(
        receive_data=receive_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )

    # Populate response with related entity names
    response_data = InventoryResponse.model_validate(inventory)
    response_data.product_sku = inventory.product.sku if inventory.product else None
    response_data.product_name = inventory.product.name if inventory.product else None
    response_data.location_name = inventory.location.name if inventory.location else None
    response_data.depositor_name = inventory.depositor.name if inventory.depositor else None

    return response_data


@router.get("/", response_model=InventoryListResponse)
async def list_inventory(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    location_id: Optional[int] = Query(None, description="Filter by location ID"),
    depositor_id: Optional[int] = Query(None, description="Filter by depositor ID"),
    status: Optional[InventoryStatus] = Query(None, description="Filter by inventory status"),
    lpn: Optional[str] = Query(None, description="Search by LPN (partial match)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryListResponse:
    """
    List inventory with optional filters and pagination.

    Supports filtering by product, location, depositor, status, and LPN.
    Returns paginated results with total count.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        product_id: Optional product ID filter
        location_id: Optional location ID filter
        depositor_id: Optional depositor ID filter
        status: Optional status filter (AVAILABLE, RESERVED, QUARANTINE, DAMAGED, MISSING)
        lpn: Optional LPN partial match search
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryListResponse: Paginated list of inventory records

    Raises:
        401: If user is not authenticated
    """
    inventory_service = InventoryService(db)
    inventories = await inventory_service.list_inventory(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        product_id=product_id,
        location_id=location_id,
        depositor_id=depositor_id,
        status=status,
        lpn=lpn
    )

    # Get total count for pagination
    total = await inventory_service.inventory_repo.count(
        tenant_id=current_user.tenant_id,
        product_id=product_id,
        location_id=location_id,
        depositor_id=depositor_id
    )

    # Populate response with related entity names
    items = []
    for inventory in inventories:
        response_data = InventoryResponse.model_validate(inventory)
        response_data.product_sku = inventory.product.sku if inventory.product else None
        response_data.product_name = inventory.product.name if inventory.product else None
        response_data.location_name = inventory.location.name if inventory.location else None
        response_data.depositor_name = inventory.depositor.name if inventory.depositor else None
        items.append(response_data)

    return InventoryListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{inventory_id}", response_model=InventoryResponse)
async def get_inventory(
    inventory_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    """
    Get inventory by ID.

    Args:
        inventory_id: ID of the inventory record
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryResponse: Inventory record details

    Raises:
        401: If user is not authenticated
        404: If inventory not found
    """
    inventory_service = InventoryService(db)
    inventory = await inventory_service.get_inventory(
        inventory_id=inventory_id,
        tenant_id=current_user.tenant_id
    )

    response_data = InventoryResponse.model_validate(inventory)
    response_data.product_sku = inventory.product.sku if inventory.product else None
    response_data.product_name = inventory.product.name if inventory.product else None
    response_data.location_name = inventory.location.name if inventory.location else None
    response_data.depositor_name = inventory.depositor.name if inventory.depositor else None

    return response_data


@router.get("/lpn/{lpn}", response_model=InventoryResponse)
async def get_inventory_by_lpn(
    lpn: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    """
    Get inventory by LPN (License Plate Number).

    Args:
        lpn: License Plate Number
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryResponse: Inventory record details

    Raises:
        401: If user is not authenticated
        404: If inventory with LPN not found
    """
    inventory_service = InventoryService(db)
    inventory = await inventory_service.get_inventory_by_lpn(
        lpn=lpn,
        tenant_id=current_user.tenant_id
    )

    response_data = InventoryResponse.model_validate(inventory)
    response_data.product_sku = inventory.product.sku if inventory.product else None
    response_data.product_name = inventory.product.name if inventory.product else None
    response_data.location_name = inventory.location.name if inventory.location else None
    response_data.depositor_name = inventory.depositor.name if inventory.depositor else None

    return response_data


@router.post("/move", response_model=InventoryResponse)
async def move_stock(
    move_data: InventoryMoveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    """
    Move inventory from one location to another.

    Uses row-level locking to prevent race conditions.
    Creates a MOVE transaction for audit trail and billing.

    Args:
        move_data: Move request data including LPN and destination location
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryResponse: Updated inventory record

    Raises:
        401: If user is not authenticated
        404: If inventory or destination location not found

    Example:
        ```json
        {
          "lpn": "LPN-ABC123",
          "to_location_id": 25,
          "reference_doc": "MOVE-ORDER-456"  // Optional
        }
        ```
    """
    inventory_service = InventoryService(db)
    inventory = await inventory_service.move_stock(
        move_data=move_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )

    response_data = InventoryResponse.model_validate(inventory)
    response_data.product_sku = inventory.product.sku if inventory.product else None
    response_data.product_name = inventory.product.name if inventory.product else None
    response_data.location_name = inventory.location.name if inventory.location else None
    response_data.depositor_name = inventory.depositor.name if inventory.depositor else None

    return response_data


@router.post("/adjust", response_model=InventoryResponse)
async def adjust_stock(
    adjust_data: InventoryAdjustRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryResponse:
    """
    Adjust inventory quantity (cycle count, damage, etc.).

    Uses row-level locking to prevent race conditions.
    Creates an ADJUSTMENT transaction for audit trail and billing.

    Args:
        adjust_data: Adjustment request data including LPN, new quantity, and reason
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryResponse: Updated inventory record

    Raises:
        400: If new quantity is negative
        401: If user is not authenticated
        404: If inventory not found

    Example:
        ```json
        {
          "lpn": "LPN-ABC123",
          "quantity": 95.0,
          "reason": "Cycle count - found 5 units damaged",
          "reference_doc": "CC-2024-001"  // Optional
        }
        ```
    """
    inventory_service = InventoryService(db)
    inventory = await inventory_service.adjust_stock(
        adjust_data=adjust_data,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id
    )

    response_data = InventoryResponse.model_validate(inventory)
    response_data.product_sku = inventory.product.sku if inventory.product else None
    response_data.product_name = inventory.product.name if inventory.product else None
    response_data.location_name = inventory.location.name if inventory.location else None
    response_data.depositor_name = inventory.depositor.name if inventory.depositor else None

    return response_data


@router.get("/transactions/", response_model=InventoryTransactionListResponse)
async def list_transactions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    inventory_id: Optional[int] = Query(None, description="Filter by inventory ID"),
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    reference_doc: Optional[str] = Query(None, description="Search by reference document"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> InventoryTransactionListResponse:
    """
    List inventory transactions with optional filters.

    View the complete audit trail of all inventory movements and changes.
    This is the source of truth for billing.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        inventory_id: Optional inventory ID filter
        product_id: Optional product ID filter
        reference_doc: Optional reference document search
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        InventoryTransactionListResponse: Paginated list of transactions

    Raises:
        401: If user is not authenticated
    """
    transaction_repo = InventoryTransactionRepository(db)
    transactions = await transaction_repo.list_transactions(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        inventory_id=inventory_id,
        product_id=product_id,
        reference_doc=reference_doc
    )

    total = await transaction_repo.count(
        tenant_id=current_user.tenant_id,
        inventory_id=inventory_id,
        product_id=product_id
    )

    # Populate response with related entity names
    items = []
    for transaction in transactions:
        response_data = InventoryTransactionResponse.model_validate(transaction)
        response_data.product_sku = transaction.product.sku if transaction.product else None
        response_data.product_name = transaction.product.name if transaction.product else None
        response_data.inventory_lpn = transaction.inventory.lpn if transaction.inventory else None
        response_data.from_location_name = transaction.from_location.name if transaction.from_location else None
        response_data.to_location_name = transaction.to_location.name if transaction.to_location else None
        response_data.performed_by_name = transaction.performed_by_user.full_name if transaction.performed_by_user else None
        items.append(response_data)

    return InventoryTransactionListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit
    )
