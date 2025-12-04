from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationResponse,
    LocationBulkCreateConfig,
    LocationBulkCreateResponse
)
from services.location_service import LocationService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationResponse:
    """
    Create a new location.

    Creates a location for the authenticated user's tenant. Name must be unique per warehouse.

    Args:
        location_data: Location creation data
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationResponse: Created location with all fields

    Raises:
        400: If name already exists in this warehouse
        404: If warehouse or zone not found
        401: If user is not authenticated
    """
    location_service = LocationService(db)
    location = await location_service.create_location(
        location_data=location_data,
        tenant_id=current_user.tenant_id
    )
    return LocationResponse.model_validate(location)


@router.post("/bulk", response_model=LocationBulkCreateResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_locations(
    config: LocationBulkCreateConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationBulkCreateResponse:
    """
    Bulk create locations from a range configuration.

    Generates multiple locations based on aisle, bay range, level range, and slot range.
    Example: Aisle A, Bays 1-10, Levels 1-5, Slots 1-2 creates locations A-01-01-01 through A-10-05-02.

    Args:
        config: Bulk creation configuration with ranges and settings
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationBulkCreateResponse: List of created locations and count

    Raises:
        400: If any location name already exists or validation fails
        404: If warehouse or zone not found
        401: If user is not authenticated
    """
    location_service = LocationService(db)
    locations = await location_service.bulk_create_locations(
        config=config,
        tenant_id=current_user.tenant_id
    )
    return LocationBulkCreateResponse(
        created_count=len(locations),
        locations=[LocationResponse.model_validate(loc) for loc in locations]
    )


@router.get("/", response_model=List[LocationResponse])
async def list_locations(
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    zone_id: Optional[int] = Query(None, description="Filter by zone ID"),
    usage_id: Optional[int] = Query(None, description="Filter by usage definition ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=10000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[LocationResponse]:
    """
    List all locations for the authenticated user's tenant.

    Supports filtering by warehouse, zone, usage_id, and pagination.

    Args:
        warehouse_id: Optional warehouse ID to filter locations
        zone_id: Optional zone ID to filter locations
        usage_id: Optional usage definition ID to filter
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[LocationResponse]: List of locations for this tenant

    Raises:
        401: If user is not authenticated
    """
    location_service = LocationService(db)
    locations = await location_service.list_locations(
        tenant_id=current_user.tenant_id,
        warehouse_id=warehouse_id,
        zone_id=zone_id,
        usage_id=usage_id,
        skip=skip,
        limit=limit
    )
    return [LocationResponse.model_validate(location) for location in locations]


@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationResponse:
    """
    Get a specific location by ID.

    Args:
        location_id: ID of the location to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationResponse: Location details

    Raises:
        404: If location not found
        401: If user is not authenticated
    """
    location_service = LocationService(db)
    location = await location_service.get_location(
        location_id=location_id,
        tenant_id=current_user.tenant_id
    )
    return LocationResponse.model_validate(location)


@router.patch("/{location_id}", response_model=LocationResponse)
async def update_location(
    location_id: int,
    location_data: LocationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationResponse:
    """
    Update an existing location.

    Updates only the fields provided in the request. Name must remain unique per warehouse.

    Args:
        location_id: ID of the location to update
        location_data: Location update data (partial updates allowed)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationResponse: Updated location with all fields

    Raises:
        404: If location not found
        400: If name conflict with existing location
        401: If user is not authenticated
    """
    location_service = LocationService(db)
    location = await location_service.update_location(
        location_id=location_id,
        location_data=location_data,
        tenant_id=current_user.tenant_id
    )
    return LocationResponse.model_validate(location)


@router.delete("/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a location.

    Args:
        location_id: ID of the location to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Raises:
        404: If location not found
        401: If user is not authenticated
    """
    location_service = LocationService(db)
    await location_service.delete_location(
        location_id=location_id,
        tenant_id=current_user.tenant_id
    )
