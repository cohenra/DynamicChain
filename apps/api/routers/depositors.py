from typing import List
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from schemas.depositor import DepositorCreate, DepositorUpdate, DepositorResponse
from services.depositor_service import DepositorService
from auth.dependencies import get_current_user
from models.user import User


router = APIRouter(prefix="/api/depositors", tags=["Depositors"])


@router.post("/", response_model=DepositorResponse, status_code=status.HTTP_201_CREATED)
async def create_depositor(
    depositor_data: DepositorCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepositorResponse:
    """
    Create a new depositor.

    Creates a depositor for the authenticated user's tenant. Code must be unique per tenant.

    Args:
        depositor_data: Depositor creation data including name, code, and contact info
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        DepositorResponse: Created depositor with all fields

    Raises:
        400: If code already exists for this tenant
        401: If user is not authenticated
    """
    depositor_service = DepositorService(db)
    depositor = await depositor_service.create_depositor(
        depositor_data=depositor_data,
        tenant_id=current_user.tenant_id
    )
    return DepositorResponse.model_validate(depositor)


@router.get("/", response_model=List[DepositorResponse])
async def list_depositors(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[DepositorResponse]:
    """
    List all depositors for the authenticated user's tenant.

    Supports pagination via skip and limit parameters.

    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum records to return (default: 100, max: 1000)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        List[DepositorResponse]: List of depositors for this tenant

    Raises:
        401: If user is not authenticated
    """
    depositor_service = DepositorService(db)
    depositors = await depositor_service.list_depositors(
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit
    )
    return [DepositorResponse.model_validate(depositor) for depositor in depositors]


@router.get("/{depositor_id}", response_model=DepositorResponse)
async def get_depositor(
    depositor_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepositorResponse:
    """
    Get a specific depositor by ID.

    Retrieves depositor details with tenant isolation - users can only access
    depositors belonging to their tenant.

    Args:
        depositor_id: ID of the depositor to retrieve
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        DepositorResponse: Depositor details

    Raises:
        401: If user is not authenticated
        404: If depositor not found or doesn't belong to user's tenant
    """
    depositor_service = DepositorService(db)
    depositor = await depositor_service.get_depositor(
        depositor_id=depositor_id,
        tenant_id=current_user.tenant_id
    )
    return DepositorResponse.model_validate(depositor)


@router.put("/{depositor_id}", response_model=DepositorResponse)
async def update_depositor(
    depositor_id: int,
    depositor_data: DepositorUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> DepositorResponse:
    """
    Update an existing depositor.

    Updates depositor fields. Code uniqueness is enforced if code is being changed.
    Only depositors belonging to the user's tenant can be updated.

    Args:
        depositor_id: ID of the depositor to update
        depositor_data: Depositor update data (partial updates supported)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        DepositorResponse: Updated depositor details

    Raises:
        400: If new code already exists for this tenant
        401: If user is not authenticated
        404: If depositor not found or doesn't belong to user's tenant
    """
    depositor_service = DepositorService(db)
    depositor = await depositor_service.update_depositor(
        depositor_id=depositor_id,
        depositor_data=depositor_data,
        tenant_id=current_user.tenant_id
    )
    return DepositorResponse.model_validate(depositor)


@router.delete("/{depositor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_depositor(
    depositor_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete a depositor.

    Permanently deletes a depositor. Only depositors belonging to the user's tenant
    can be deleted.

    Args:
        depositor_id: ID of the depositor to delete
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        None: 204 No Content on success

    Raises:
        401: If user is not authenticated
        404: If depositor not found or doesn't belong to user's tenant
    """
    depositor_service = DepositorService(db)
    await depositor_service.delete_depositor(
        depositor_id=depositor_id,
        tenant_id=current_user.tenant_id
    )
