"""
Service for OrderTypeDefinition - Business logic for dynamic order types.
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from repositories.order_type_definition_repository import OrderTypeDefinitionRepository
from models.order_type_definition import OrderTypeDefinition, OrderTypeBehavior


class OrderTypeService:
    """Service for managing dynamic order types."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrderTypeDefinitionRepository(db)

    async def create_order_type(
        self,
        tenant_id: int,
        code: str,
        name: str,
        description: Optional[str] = None,
        default_priority: int = 5,
        behavior_key: str = OrderTypeBehavior.B2B.value,
        is_active: bool = True
    ) -> OrderTypeDefinition:
        """Create a new order type definition."""
        # Check for duplicate code
        if await self.repo.code_exists(code, tenant_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Order type with code '{code}' already exists"
            )

        # Validate behavior_key
        valid_behaviors = [b.value for b in OrderTypeBehavior]
        if behavior_key not in valid_behaviors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid behavior_key. Must be one of: {', '.join(valid_behaviors)}"
            )

        order_type = OrderTypeDefinition(
            tenant_id=tenant_id,
            code=code.upper(),
            name=name,
            description=description,
            default_priority=default_priority,
            behavior_key=behavior_key,
            is_active=is_active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

        return await self.repo.create(order_type)

    async def get_order_type(
        self,
        order_type_id: int,
        tenant_id: int
    ) -> OrderTypeDefinition:
        """Get an order type by ID."""
        order_type = await self.repo.get_by_id(order_type_id, tenant_id)
        if not order_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order type {order_type_id} not found"
            )
        return order_type

    async def get_order_type_by_code(
        self,
        code: str,
        tenant_id: int
    ) -> OrderTypeDefinition:
        """Get an order type by code."""
        order_type = await self.repo.get_by_code(code.upper(), tenant_id)
        if not order_type:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Order type '{code}' not found"
            )
        return order_type

    async def list_order_types(
        self,
        tenant_id: int,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100
    ) -> List[OrderTypeDefinition]:
        """List all order types for a tenant."""
        if active_only:
            return await self.repo.list_active(tenant_id, skip, limit)
        return await self.repo.list(tenant_id, skip, limit, order_by=OrderTypeDefinition.name)

    async def update_order_type(
        self,
        order_type_id: int,
        tenant_id: int,
        code: Optional[str] = None,
        name: Optional[str] = None,
        description: Optional[str] = None,
        default_priority: Optional[int] = None,
        behavior_key: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> OrderTypeDefinition:
        """Update an order type definition."""
        order_type = await self.get_order_type(order_type_id, tenant_id)

        if code is not None:
            code = code.upper()
            if await self.repo.code_exists(code, tenant_id, exclude_id=order_type_id):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Order type with code '{code}' already exists"
                )
            order_type.code = code

        if name is not None:
            order_type.name = name

        if description is not None:
            order_type.description = description

        if default_priority is not None:
            order_type.default_priority = default_priority

        if behavior_key is not None:
            valid_behaviors = [b.value for b in OrderTypeBehavior]
            if behavior_key not in valid_behaviors:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid behavior_key. Must be one of: {', '.join(valid_behaviors)}"
                )
            order_type.behavior_key = behavior_key

        if is_active is not None:
            order_type.is_active = is_active

        order_type.updated_at = datetime.utcnow()

        return await self.repo.update(order_type)

    async def delete_order_type(
        self,
        order_type_id: int,
        tenant_id: int
    ) -> None:
        """Delete an order type (soft delete by deactivating is preferred)."""
        order_type = await self.get_order_type(order_type_id, tenant_id)

        # Check if any orders use this type
        # For safety, we'll just deactivate instead of hard delete
        order_type.is_active = False
        order_type.updated_at = datetime.utcnow()
        await self.repo.update(order_type)

    async def seed_default_order_types(self, tenant_id: int) -> List[OrderTypeDefinition]:
        """
        Seed default order types for a new tenant.
        This ensures backward compatibility with existing hardcoded types.
        """
        default_types = [
            {"code": "SALES", "name": "Sales Order", "behavior_key": "B2B", "default_priority": 5},
            {"code": "ECOM", "name": "E-Commerce", "behavior_key": "ECOM", "default_priority": 8},
            {"code": "B2B", "name": "B2B Order", "behavior_key": "B2B", "default_priority": 5},
            {"code": "TRANSFER", "name": "Transfer", "behavior_key": "TRANSFER", "default_priority": 3},
            {"code": "RETURN", "name": "Return", "behavior_key": "RETURN", "default_priority": 2},
            {"code": "RETAIL", "name": "Retail", "behavior_key": "RETAIL", "default_priority": 5},
            {"code": "SAMPLE", "name": "Sample", "behavior_key": "B2B", "default_priority": 1},
        ]

        created_types = []
        for type_data in default_types:
            # Skip if already exists
            if await self.repo.code_exists(type_data["code"], tenant_id):
                continue

            order_type = OrderTypeDefinition(
                tenant_id=tenant_id,
                code=type_data["code"],
                name=type_data["name"],
                behavior_key=type_data["behavior_key"],
                default_priority=type_data["default_priority"],
                is_active=True,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            created = await self.repo.create(order_type)
            created_types.append(created)

        return created_types
