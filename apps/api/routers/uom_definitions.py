from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.uom_definition import UomDefinitionCreate, UomDefinitionUpdate, UomDefinitionResponse
from services.uom_definition_service import UomDefinitionService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/uom-definitions", tags=["UOM Definitions"])


@router.post("/", response_model=UomDefinitionResponse, status_code=status.HTTP_201_CREATED)
async def create_uom_definition(
    uom_definition_data: UomDefinitionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UomDefinitionResponse:
    """
    Create a new UOM definition.

    Creates a UOM definition for the authenticated user's tenant. Code must be unique per tenant.

    Args:
        uom_definition_data: UOM definition creation data including name and code
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        UomDefinitionResponse: Created UOM definition with all fields

    Raises:
        400: If code already exists for this tenant
        401: If user is not authenticated
    """
    uom_definition_service = UomDefinitionService(db)
    uom_definition = await uom_definition_service.create_uom_definition(
        uom_definition_data=uom_definition_data,
        tenant_id=current_user.tenant_id
    )
    return UomDefinitionResponse.model_validate(uom_definition)


@router.get("/", response_model=List[UomDefinitionResponse])
async def list_uom_definitions(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[UomDefinitionResponse]:
    """
    List all UOM definitions for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[UomDefinitionResponse]: List of UOM definitions for this tenant

    Raises:
        401: If user is not authenticated
    """
    uom_definition_service = UomDefinitionService(db)
    uom_definitions = await uom_definition_service.list_uom_definitions(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return [UomDefinitionResponse.model_validate(uom_definition) for uom_definition in uom_definitions]


@router.get("/{uom_definition_id}", response_model=UomDefinitionResponse)
async def get_uom_definition(
    uom_definition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UomDefinitionResponse:
    """
    Get a specific UOM definition by ID.

    Retrieves UOM definition details with tenant isolation - users can only access
    UOM definitions belonging to their tenant.

    Args:
        uom_definition_id: ID of the UOM definition to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        UomDefinitionResponse: UOM definition details

    Raises:
        401: If user is not authenticated
        404: If UOM definition not found or doesn't belong to user's tenant
    """
    uom_definition_service = UomDefinitionService(db)
    uom_definition = await uom_definition_service.get_uom_definition(
        uom_definition_id=uom_definition_id,
        tenant_id=current_user.tenant_id
    )
    return UomDefinitionResponse.model_validate(uom_definition)


@router.put("/{uom_definition_id}", response_model=UomDefinitionResponse)
async def update_uom_definition(
    uom_definition_id: int,
    uom_definition_data: UomDefinitionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> UomDefinitionResponse:
    """
    Update an existing UOM definition.

    Updates UOM definition fields. Code uniqueness is enforced if code is being changed.
    Only UOM definitions belonging to the user's tenant can be updated.

    Args:
        uom_definition_id: ID of the UOM definition to update
        uom_definition_data: UOM definition update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        UomDefinitionResponse: Updated UOM definition details

    Raises:
        400: If new code already exists for this tenant
        401: If user is not authenticated
        404: If UOM definition not found or doesn't belong to user's tenant
    """
    uom_definition_service = UomDefinitionService(db)
    uom_definition = await uom_definition_service.update_uom_definition(
        uom_definition_id=uom_definition_id,
        uom_definition_data=uom_definition_data,
        tenant_id=current_user.tenant_id
    )
    return UomDefinitionResponse.model_validate(uom_definition)


@router.delete("/{uom_definition_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_uom_definition(
    uom_definition_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a UOM definition.

    Permanently deletes a UOM definition. Only UOM definitions belonging to the user's tenant
    can be deleted.

    Args:
        uom_definition_id: ID of the UOM definition to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If UOM definition not found or doesn't belong to user's tenant
    """
    uom_definition_service = UomDefinitionService(db)
    await uom_definition_service.delete_uom_definition(
        uom_definition_id=uom_definition_id,
        tenant_id=current_user.tenant_id
    )
