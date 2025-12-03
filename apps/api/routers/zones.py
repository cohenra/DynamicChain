from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.zone import ZoneCreate, ZoneUpdate, ZoneResponse
from services.zone_service import ZoneService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/zones", tags=["Zones"])


@router.post("/", response_model=ZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: ZoneCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ZoneResponse:
    """
    Create a new zone.

    Creates a zone for the authenticated user's tenant. Code must be unique per warehouse.

    Args:
        zone_data: Zone creation data including name, code, and warehouse_id
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ZoneResponse: Created zone with all fields

    Raises:
        400: If code already exists in this warehouse
        404: If warehouse not found
        401: If user is not authenticated
    """
    zone_service = ZoneService(db)
    zone = await zone_service.create_zone(
        zone_data=zone_data,
        tenant_id=current_user.tenant_id
    )
    return ZoneResponse.model_validate(zone)


@router.get("/", response_model=List[ZoneResponse])
async def list_zones(
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[ZoneResponse]:
    """
    List all zones for the authenticated user's tenant.

    Supports filtering by warehouse and pagination via skip and limit parameters.

    Args:
        warehouse_id: Optional warehouse ID to filter zones
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[ZoneResponse]: List of zones for this tenant

    Raises:
        401: If user is not authenticated
    """
    zone_service = ZoneService(db)
    zones = await zone_service.list_zones(
        tenant_id=current_user.tenant_id,
        warehouse_id=warehouse_id,
        skip=skip,
        limit=limit
    )
    return [ZoneResponse.model_validate(zone) for zone in zones]


@router.get("/{zone_id}", response_model=ZoneResponse)
async def get_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ZoneResponse:
    """
    Get a specific zone by ID.

    Args:
        zone_id: ID of the zone to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ZoneResponse: Zone details

    Raises:
        404: If zone not found
        401: If user is not authenticated
    """
    zone_service = ZoneService(db)
    zone = await zone_service.get_zone(
        zone_id=zone_id,
        tenant_id=current_user.tenant_id
    )
    return ZoneResponse.model_validate(zone)


@router.patch("/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: int,
    zone_data: ZoneUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> ZoneResponse:
    """
    Update an existing zone.

    Updates only the fields provided in the request. Code must remain unique per warehouse.

    Args:
        zone_id: ID of the zone to update
        zone_data: Zone update data (partial updates allowed)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ZoneResponse: Updated zone with all fields

    Raises:
        404: If zone not found
        400: If code conflict with existing zone
        401: If user is not authenticated
    """
    zone_service = ZoneService(db)
    zone = await zone_service.update_zone(
        zone_id=zone_id,
        zone_data=zone_data,
        tenant_id=current_user.tenant_id
    )
    return ZoneResponse.model_validate(zone)


@router.delete("/{zone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_zone(
    zone_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a zone.

    Deletes the zone and all associated locations (cascade).

    Args:
        zone_id: ID of the zone to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Raises:
        404: If zone not found
        401: If user is not authenticated
    """
    zone_service = ZoneService(db)
    await zone_service.delete_zone(
        zone_id=zone_id,
        tenant_id=current_user.tenant_id
    )
