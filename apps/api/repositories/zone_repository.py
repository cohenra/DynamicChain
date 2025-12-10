from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from models.zone import Zone
from repositories.base_repository import BaseRepository


class ZoneRepository(BaseRepository[Zone]):
    """Repository for Zone database operations with tenant isolation."""

    def __init__(self, db: AsyncSession):
        super().__init__(db, Zone)

    async def get_by_id(self, zone_id: int, tenant_id: int) -> Optional[Zone]:
        """Get a zone by ID with tenant isolation and relationships loaded."""
        result = await self.db.execute(
            select(Zone)
            .options(
                selectinload(Zone.warehouse)
            )
            .where(
                and_(
                    Zone.id == zone_id,
                    Zone.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str, warehouse_id: int, tenant_id: int) -> Optional[Zone]:
        """Get a zone by code within a warehouse and tenant."""
        result = await self.db.execute(
            select(Zone).where(
                and_(
                    Zone.code == code,
                    Zone.warehouse_id == warehouse_id,
                    Zone.tenant_id == tenant_id
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_zones(
        self,
        tenant_id: int,
        warehouse_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Zone]:
        """List all zones for a tenant with optional warehouse filter and pagination."""
        filters = []
        if warehouse_id is not None:
            filters.append(Zone.warehouse_id == warehouse_id)

        options = [selectinload(Zone.warehouse)]

        return await self.list(
            tenant_id=tenant_id,
            skip=skip,
            limit=limit,
            filters=filters if filters else None,
            options=options
        )

    async def count(self, tenant_id: int, warehouse_id: Optional[int] = None) -> int:
        """Count total zones for a tenant with optional warehouse filter."""
        filters = []
        if warehouse_id is not None:
            filters.append(Zone.warehouse_id == warehouse_id)

        return await super().count(
            tenant_id=tenant_id,
            filters=filters if filters else None
        )

    async def update(self, zone: Zone) -> Zone:
        """Update an existing zone and return with relationships loaded."""
        await self.db.flush()
        return await self.get_by_id(zone.id, zone.tenant_id)
