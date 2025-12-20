from typing import List, Optional, Any
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
from pydantic import BaseModel

router = APIRouter(prefix="/api/locations", tags=["Locations"])

# סכמה חדשה לתגובת פגינציה
class PaginatedLocationResponse(BaseModel):
    items: List[LocationResponse]
    total: int

@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_data: LocationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationResponse:
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
    location_service = LocationService(db)
    locations = await location_service.bulk_create_locations(
        config=config,
        tenant_id=current_user.tenant_id
    )
    return LocationBulkCreateResponse(
        created_count=len(locations),
        locations=[LocationResponse.model_validate(loc) for loc in locations]
    )

@router.get("/", response_model=PaginatedLocationResponse)
async def list_locations(
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    zone_id: Optional[int] = Query(None, description="Filter by zone ID"),
    usage_id: Optional[int] = Query(None, description="Filter by usage definition ID"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=10000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> PaginatedLocationResponse:
    """
    List locations with pagination and total count.
    """
    location_service = LocationService(db)
    
    # שליפת הנתונים
    locations = await location_service.list_locations(
        tenant_id=current_user.tenant_id,
        warehouse_id=warehouse_id,
        zone_id=zone_id,
        usage_id=usage_id,
        skip=skip,
        limit=limit
    )
    
    # שליפת סך הכל רשומות (עבור הטבלה)
    total_count = await location_service.count_locations(
        tenant_id=current_user.tenant_id,
        warehouse_id=warehouse_id,
        zone_id=zone_id,
        usage_id=usage_id
    )

    return PaginatedLocationResponse(
        items=[LocationResponse.model_validate(loc) for loc in locations],
        total=total_count
    )

@router.get("/{location_id}", response_model=LocationResponse)
async def get_location(
    location_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationResponse:
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
    location_service = LocationService(db)
    await location_service.delete_location(
        location_id=location_id,
        tenant_id=current_user.tenant_id
    )