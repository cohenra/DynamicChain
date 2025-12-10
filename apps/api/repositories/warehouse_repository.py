from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from models.warehouse import Warehouse
from repositories.base_repository import BaseRepository


class WarehouseRepository(BaseRepository[Warehouse]):
    """Repository for Warehouse database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Warehouse)

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
        return await self.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit
        )
