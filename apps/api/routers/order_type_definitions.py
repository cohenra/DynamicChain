"""
Router for OrderTypeDefinition API - CRUD endpoints for dynamic order types.
"""
from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from auth.dependencies import get_current_user
from models.user import User
from services.order_type_service import OrderTypeService
from schemas.order_type_definition import (
    OrderTypeDefinitionCreate,
    OrderTypeDefinitionUpdate,
    OrderTypeDefinitionResponse,
    OrderTypeDefinitionListResponse,
    OrderTypeSelectOption
)


router = APIRouter(prefix="/api/order-types", tags=["Order Types"])


@router.get("", response_model=List[OrderTypeDefinitionListResponse])
async def list_order_types(
    active_only: bool = Query(True, description="Only return active types"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[OrderTypeDefinitionListResponse]:
    """
    List all order types for the tenant.
    Used for dropdown population and configuration.
    """
    service = OrderTypeService(db)
    order_types = await service.list_order_types(
        tenant_id=current_user.tenant_id,
        active_only=active_only,
        skip=skip,
        limit=limit
    )
    return [OrderTypeDefinitionListResponse.model_validate(ot) for ot in order_types]


@router.get("/select-options", response_model=List[OrderTypeSelectOption])
async def get_order_type_options(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[OrderTypeSelectOption]:
    """
    Get order types as select options for frontend dropdowns.
    Only returns active types with minimal fields.
    """
    service = OrderTypeService(db)
    order_types = await service.list_order_types(
        tenant_id=current_user.tenant_id,
        active_only=True
    )
    return [OrderTypeSelectOption.model_validate(ot) for ot in order_types]


@router.get("/{order_type_id}", response_model=OrderTypeDefinitionResponse)
async def get_order_type(
    order_type_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OrderTypeDefinitionResponse:
    """Get a specific order type by ID."""
    service = OrderTypeService(db)
    order_type = await service.get_order_type(order_type_id, current_user.tenant_id)
    return OrderTypeDefinitionResponse.model_validate(order_type)


@router.get("/code/{code}", response_model=OrderTypeDefinitionResponse)
async def get_order_type_by_code(
    code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OrderTypeDefinitionResponse:
    """Get a specific order type by code."""
    service = OrderTypeService(db)
    order_type = await service.get_order_type_by_code(code, current_user.tenant_id)
    return OrderTypeDefinitionResponse.model_validate(order_type)


@router.post("", response_model=OrderTypeDefinitionResponse, status_code=status.HTTP_201_CREATED)
async def create_order_type(
    data: OrderTypeDefinitionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OrderTypeDefinitionResponse:
    """Create a new order type definition."""
    service = OrderTypeService(db)
    order_type = await service.create_order_type(
        tenant_id=current_user.tenant_id,
        code=data.code,
        name=data.name,
        description=data.description,
        default_priority=data.default_priority,
        behavior_key=data.behavior_key.value,
        is_active=data.is_active
    )
    return OrderTypeDefinitionResponse.model_validate(order_type)


@router.put("/{order_type_id}", response_model=OrderTypeDefinitionResponse)
async def update_order_type(
    order_type_id: int,
    data: OrderTypeDefinitionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> OrderTypeDefinitionResponse:
    """Update an order type definition."""
    service = OrderTypeService(db)
    order_type = await service.update_order_type(
        order_type_id=order_type_id,
        tenant_id=current_user.tenant_id,
        code=data.code,
        name=data.name,
        description=data.description,
        default_priority=data.default_priority,
        behavior_key=data.behavior_key.value if data.behavior_key else None,
        is_active=data.is_active
    )
    return OrderTypeDefinitionResponse.model_validate(order_type)


@router.delete("/{order_type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_type(
    order_type_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete (deactivate) an order type.
    Note: This soft-deletes by setting is_active=False.
    """
    service = OrderTypeService(db)
    await service.delete_order_type(order_type_id, current_user.tenant_id)


@router.post("/seed", response_model=List[OrderTypeDefinitionResponse])
async def seed_default_order_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[OrderTypeDefinitionResponse]:
    """
    Seed default order types for the tenant.
    Use this for initial setup or migration from hardcoded types.
    """
    service = OrderTypeService(db)
    created_types = await service.seed_default_order_types(current_user.tenant_id)
    return [OrderTypeDefinitionResponse.model_validate(ot) for ot in created_types]
