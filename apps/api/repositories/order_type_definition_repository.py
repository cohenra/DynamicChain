"""
Repository for OrderTypeDefinition - CRUD operations for dynamic order types.
"""
from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.base_repository import BaseRepository
from models.order_type_definition import OrderTypeDefinition


class OrderTypeDefinitionRepository(BaseRepository[OrderTypeDefinition]):
    """Repository for OrderTypeDefinition CRUD operations."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, OrderTypeDefinition)

    async def get_by_code(
        self,
        code: str,
        tenant_id: int
    ) -> Optional[OrderTypeDefinition]:
        """Get an order type by its code."""
        stmt = select(OrderTypeDefinition).where(
            and_(
                OrderTypeDefinition.code == code,
                OrderTypeDefinition.tenant_id == tenant_id
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_active(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[OrderTypeDefinition]:
        """List only active order types."""
        return await self.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=[OrderTypeDefinition.is_active == True],
            order_by=OrderTypeDefinition.name
        )

    async def list_by_behavior(
        self,
        tenant_id: int,
        behavior_key: str,
        active_only: bool = True
    ) -> List[OrderTypeDefinition]:
        """List order types by behavior key."""
        filters = [OrderTypeDefinition.behavior_key == behavior_key]
        if active_only:
            filters.append(OrderTypeDefinition.is_active == True)

        return await self.list(
            tenant_id=tenant_id,
            filters=filters,
            order_by=OrderTypeDefinition.name
        )

    async def code_exists(
        self,
        code: str,
        tenant_id: int,
        exclude_id: Optional[int] = None
    ) -> bool:
        """Check if a code already exists for the tenant."""
        stmt = select(OrderTypeDefinition.id).where(
            and_(
                OrderTypeDefinition.code == code,
                OrderTypeDefinition.tenant_id == tenant_id
            )
        )
        if exclude_id:
            stmt = stmt.where(OrderTypeDefinition.id != exclude_id)

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None
