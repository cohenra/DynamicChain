from typing import Optional, List
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.warehouse import Warehouse


class WarehouseRepository:
    """Repository for Warehouse database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, warehouse: Warehouse) -> Warehouse:
        """Create a new warehouse."""
        self.db.add(warehouse)
        await self.db.flush()
        await self.db.refresh(warehouse)
        return warehouse

    async def get_by_id(self, warehouse_id: int, tenant_id: int) -> Optional[Warehouse]:
        """Get a warehouse by ID with tenant isolation."""
        result = await self.db.execute(
            select(Warehouse).where(
                and_(
                    Warehouse.id == warehouse_id,
                    Warehouse.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str, tenant_id: int) -> Optional[Warehouse]:
        """Get a warehouse by code within a tenant."""
        result = await self.db.execute(
            select(Warehouse).where(
                and_(
                    Warehouse.code == code,
                    Warehouse.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_warehouses(
        self,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Warehouse]:
        """List all warehouses for a tenant with pagination."""
        result = await self.db.execute(
            select(Warehouse)
            .where(Warehouse.tenant_id == tenant_id)
            .offset(skip)
            .limit(limit)
            .order_by(Warehouse.created_at.desc())
        )
        return list(result.scalars().all())

    async def count(self, tenant_id: int) -> int:
        """Count total warehouses for a tenant."""
        result = await self.db.execute(
            select(func.count(Warehouse.id)).where(Warehouse.tenant_id == tenant_id)
        )
        return result.scalar_one()

    async def update(self, warehouse: Warehouse) -> Warehouse:
        """Update an existing warehouse."""
        await self.db.flush()
        await self.db.refresh(warehouse)
        return warehouse

    async def delete(self, warehouse: Warehouse) -> None:
        """Delete a warehouse."""
        await self.db.delete(warehouse)
        await self.db.flush()
