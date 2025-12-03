from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.location_usage_definition import LocationUsageDefinitionCreate, LocationUsageDefinitionUpdate, LocationUsageDefinitionResponse
from services.location_usage_definition_service import LocationUsageDefinitionService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/location-usage-definitions", tags=["Location Usage Definitions"])


@router.post("/", response_model=LocationUsageDefinitionResponse, status_code=status.HTTP_201_CREATED)
async def create_location_usage_definition(
    definition_data: LocationUsageDefinitionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationUsageDefinitionResponse:
    """
    Create a new location usage definition.

    Creates a location usage definition for the authenticated user's tenant. Code must be unique per tenant.

    Args:
        definition_data: Location usage definition creation data including name and code
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationUsageDefinitionResponse: Created location usage definition with all fields

    Raises:
        400: If code already exists for this tenant
        401: If user is not authenticated
    """
    service = LocationUsageDefinitionService(db)
    definition = await service.create_definition(
        definition_data=definition_data,
        tenant_id=current_user.tenant_id
    )
    return LocationUsageDefinitionResponse.model_validate(definition)


@router.get("/", response_model=List[LocationUsageDefinitionResponse])
async def list_location_usage_definitions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[LocationUsageDefinitionResponse]:
    """
    List all location usage definitions for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[LocationUsageDefinitionResponse]: List of location usage definitions for this tenant

    Raises:
        401: If user is not authenticated
    """
    service = LocationUsageDefinitionService(db)
    definitions = await service.list_definitions(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return [LocationUsageDefinitionResponse.model_validate(definition) for definition in definitions]


@router.get("/{definition_id}", response_model=LocationUsageDefinitionResponse)
async def get_location_usage_definition(
    definition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationUsageDefinitionResponse:
    """
    Get a specific location usage definition by ID.

    Retrieves location usage definition details with tenant isolation - users can only access
    definitions belonging to their tenant.

    Args:
        definition_id: ID of the location usage definition to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationUsageDefinitionResponse: Location usage definition details

    Raises:
        401: If user is not authenticated
        404: If definition not found or doesn't belong to user's tenant
    """
    service = LocationUsageDefinitionService(db)
    definition = await service.get_definition(
        definition_id=definition_id,
        tenant_id=current_user.tenant_id
    )
    return LocationUsageDefinitionResponse.model_validate(definition)


@router.put("/{definition_id}", response_model=LocationUsageDefinitionResponse)
async def update_location_usage_definition(
    definition_id: int,
    definition_data: LocationUsageDefinitionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationUsageDefinitionResponse:
    """
    Update an existing location usage definition.

    Updates location usage definition fields. Code uniqueness is enforced if code is being changed.
    Only definitions belonging to the user's tenant can be updated.

    Args:
        definition_id: ID of the location usage definition to update
        definition_data: Location usage definition update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationUsageDefinitionResponse: Updated location usage definition details

    Raises:
        400: If new code already exists for this tenant
        401: If user is not authenticated
        404: If definition not found or doesn't belong to user's tenant
    """
    service = LocationUsageDefinitionService(db)
    definition = await service.update_definition(
        definition_id=definition_id,
        definition_data=definition_data,
        tenant_id=current_user.tenant_id
    )
    return LocationUsageDefinitionResponse.model_validate(definition)


@router.delete("/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location_usage_definition(
    definition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a location usage definition.

    Permanently deletes a location usage definition. Only definitions belonging to the user's tenant
    can be deleted.

    Args:
        definition_id: ID of the location usage definition to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If definition not found or doesn't belong to user's tenant
    """
    service = LocationUsageDefinitionService(db)
    await service.delete_definition(
        definition_id=definition_id,
        tenant_id=current_user.tenant_id
    )
