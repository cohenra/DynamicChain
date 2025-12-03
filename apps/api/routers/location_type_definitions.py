from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.location_type_definition import LocationTypeDefinitionCreate, LocationTypeDefinitionUpdate, LocationTypeDefinitionResponse
from services.location_type_definition_service import LocationTypeDefinitionService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/location-type-definitions", tags=["Location Type Definitions"])


@router.post("/", response_model=LocationTypeDefinitionResponse, status_code=status.HTTP_201_CREATED)
async def create_location_type_definition(
    definition_data: LocationTypeDefinitionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationTypeDefinitionResponse:
    """
    Create a new location type definition.

    Creates a location type definition for the authenticated user's tenant. Code must be unique per tenant.

    Args:
        definition_data: Location type definition creation data including name and code
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationTypeDefinitionResponse: Created location type definition with all fields

    Raises:
        400: If code already exists for this tenant
        401: If user is not authenticated
    """
    service = LocationTypeDefinitionService(db)
    definition = await service.create_definition(
        definition_data=definition_data,
        tenant_id=current_user.tenant_id
    )
    return LocationTypeDefinitionResponse.model_validate(definition)


@router.get("/", response_model=List[LocationTypeDefinitionResponse])
async def list_location_type_definitions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[LocationTypeDefinitionResponse]:
    """
    List all location type definitions for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[LocationTypeDefinitionResponse]: List of location type definitions for this tenant

    Raises:
        401: If user is not authenticated
    """
    service = LocationTypeDefinitionService(db)
    definitions = await service.list_definitions(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return [LocationTypeDefinitionResponse.model_validate(definition) for definition in definitions]


@router.get("/{definition_id}", response_model=LocationTypeDefinitionResponse)
async def get_location_type_definition(
    definition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationTypeDefinitionResponse:
    """
    Get a specific location type definition by ID.

    Retrieves location type definition details with tenant isolation - users can only access
    definitions belonging to their tenant.

    Args:
        definition_id: ID of the location type definition to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationTypeDefinitionResponse: Location type definition details

    Raises:
        401: If user is not authenticated
        404: If definition not found or doesn't belong to user's tenant
    """
    service = LocationTypeDefinitionService(db)
    definition = await service.get_definition(
        definition_id=definition_id,
        tenant_id=current_user.tenant_id
    )
    return LocationTypeDefinitionResponse.model_validate(definition)


@router.put("/{definition_id}", response_model=LocationTypeDefinitionResponse)
async def update_location_type_definition(
    definition_id: int,
    definition_data: LocationTypeDefinitionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> LocationTypeDefinitionResponse:
    """
    Update an existing location type definition.

    Updates location type definition fields. Code uniqueness is enforced if code is being changed.
    Only definitions belonging to the user's tenant can be updated.

    Args:
        definition_id: ID of the location type definition to update
        definition_data: Location type definition update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        LocationTypeDefinitionResponse: Updated location type definition details

    Raises:
        400: If new code already exists for this tenant
        401: If user is not authenticated
        404: If definition not found or doesn't belong to user's tenant
    """
    service = LocationTypeDefinitionService(db)
    definition = await service.update_definition(
        definition_id=definition_id,
        definition_data=definition_data,
        tenant_id=current_user.tenant_id
    )
    return LocationTypeDefinitionResponse.model_validate(definition)


@router.delete("/{definition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_location_type_definition(
    definition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a location type definition.

    Permanently deletes a location type definition. Only definitions belonging to the user's tenant
    can be deleted.

    Args:
        definition_id: ID of the location type definition to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If definition not found or doesn't belong to user's tenant
    """
    service = LocationTypeDefinitionService(db)
    await service.delete_definition(
        definition_id=definition_id,
        tenant_id=current_user.tenant_id
    )
