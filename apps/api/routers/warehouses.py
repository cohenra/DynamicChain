from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseResponse
from services.warehouse_service import WarehouseService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/warehouses", tags=["Warehouses"])


@router.post("/", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WarehouseResponse:
    """
    Create a new warehouse.

    Creates a warehouse for the authenticated user's tenant. Code must be unique per tenant.

    Args:
        warehouse_data: Warehouse creation data including name, code, and address
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        WarehouseResponse: Created warehouse with all fields

    Raises:
        400: If code already exists for this tenant
        401: If user is not authenticated
    """
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.create_warehouse(
        warehouse_data=warehouse_data,
        tenant_id=current_user.tenant_id
    )
    return WarehouseResponse.model_validate(warehouse)


@router.get("/", response_model=List[WarehouseResponse])
async def list_warehouses(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[WarehouseResponse]:
    """
    List all warehouses for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[WarehouseResponse]: List of warehouses for this tenant

    Raises:
        401: If user is not authenticated
    """
    warehouse_service = WarehouseService(db)
    warehouses = await warehouse_service.list_warehouses(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return [WarehouseResponse.model_validate(warehouse) for warehouse in warehouses]


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WarehouseResponse:
    """
    Get a specific warehouse by ID.

    Retrieves warehouse details with tenant isolation - users can only access
    warehouses belonging to their tenant.

    Args:
        warehouse_id: ID of the warehouse to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        WarehouseResponse: Warehouse details

    Raises:
        401: If user is not authenticated
        404: If warehouse not found or doesn't belong to user's tenant
    """
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.get_warehouse(
        warehouse_id=warehouse_id,
        tenant_id=current_user.tenant_id
    )
    return WarehouseResponse.model_validate(warehouse)


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: int,
    warehouse_data: WarehouseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> WarehouseResponse:
    """
    Update an existing warehouse.

    Updates warehouse fields. Code uniqueness is enforced if code is being changed.
    Only warehouses belonging to the user's tenant can be updated.

    Args:
        warehouse_id: ID of the warehouse to update
        warehouse_data: Warehouse update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        WarehouseResponse: Updated warehouse details

    Raises:
        400: If new code already exists for this tenant
        401: If user is not authenticated
        404: If warehouse not found or doesn't belong to user's tenant
    """
    warehouse_service = WarehouseService(db)
    warehouse = await warehouse_service.update_warehouse(
        warehouse_id=warehouse_id,
        warehouse_data=warehouse_data,
        tenant_id=current_user.tenant_id
    )
    return WarehouseResponse.model_validate(warehouse)


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(
    warehouse_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a warehouse.

    Permanently deletes a warehouse. Only warehouses belonging to the user's tenant
    can be deleted.

    Args:
        warehouse_id: ID of the warehouse to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If warehouse not found or doesn't belong to user's tenant
    """
    warehouse_service = WarehouseService(db)
    await warehouse_service.delete_warehouse(
        warehouse_id=warehouse_id,
        tenant_id=current_user.tenant_id
    )
